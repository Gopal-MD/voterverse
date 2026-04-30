/**
 * VoterVerse — Express Backend Server
 * All routes, security middleware, and static file serving.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const constants = require('./config/constants');
const logger = require('./auditLogger');
const db = require('./database');
const ai = require('./aiService');
const translate = require('./translationService');
const secrets = require('./config/secrets');
const storage = require('./storageService');
const { validateFraudReport } = require('./cloud-functions/mockFunctions');

const app = express();
const PORT = process.env.PORT || constants.SERVER.DEFAULT_PORT;

// ─── Initialize Secrets ───
// This is done before any services start to ensure keys are available
secrets.initSecrets().then(() => {
  logger.info('Secrets initialization attempt completed');
});

// Trust the reverse proxy (Cloud Run) for rate limiting
app.set('trust proxy', constants.SERVER.TRUST_PROXY_HOPS);

// ─── Security Middleware ───

/**
 * Configure CSP to allow necessary Google services while preventing XSS.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: constants.SECURITY.CSP_DIRECTIVES,
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Disable x-powered-by to prevent fingerprinting
app.disable('x-powered-by');

/**
 * Configure CORS to restrict cross-origin requests in production.
 */
const allowedOrigins = [
  ...constants.SECURITY.CORS_ALLOWED_ORIGINS,
  process.env.CLOUD_RUN_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.includes(origin)) return callback(null, true);
        logger.warn('CORS rejected origin', { origin });
        return callback(new Error(`CORS policy violation: ${origin}`));
      }
      callback(null, true);
    },
    credentials: true,
  })
);

/**
 * General API Rate Limiter
 */
const limiter = rateLimit({
  windowMs: constants.SECURITY.RATE_LIMIT_WINDOW_MS,
  max: constants.SECURITY.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(constants.SERVER.API_PREFIX, limiter);

/**
 * Specialized Rate Limiter for AI Chat (more restrictive to prevent abuse)
 */
const chatLimiter = rateLimit({
  windowMs: constants.SECURITY.CHAT_LIMIT_WINDOW_MS,
  max: constants.SECURITY.CHAT_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit exceeded. Please wait a moment.' },
});

// Global Body Parsing - Default limit
app.use(express.json({ limit: constants.SERVER.BODY_LIMIT_DEFAULT }));
app.use(express.urlencoded({ extended: true, limit: constants.SERVER.BODY_LIMIT_DEFAULT }));

/**
 * Helper: Sanitize and escape user input to prevent XSS.
 * @param {string} str - Input string
 * @param {number} [maxLen=1000] - Maximum allowed length
 * @returns {string} Sanitized string
 */
const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
function sanitize(str, maxLen = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLen).replace(/[&<>"']/g, c => HTML_ESCAPE[c]);
}

/**
 * Helper: Generate a unique report ID with timestamp and entropy.
 * @returns {string} Unique ID
 */
function generateReportId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `VV-${timestamp}-${random}`;
}

// ─── API Routes ───

/**
 * GET /api/health
 * Returns service health status and current database mode.
 */
app.get('/api/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      firebase: db.getMode() === 'firebase',
      mode: db.getMode(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Cloud Run / Kubernetes probe alias
app.get('/healthz', (req, res) => res.status(200).send('OK'));

/**
 * GET /api/config
 * Returns client-side runtime configuration.
 */
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.json({
    mapsApiKey: process.env.MAPS_API_KEY || '',
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
  });
});

/**
 * POST /api/translate
 * Translates text into a target regional language.
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Text and targetLang are required' });
    }
    const translated = await translate.translateText(text, targetLang);
    res.json({ translated });
  } catch (err) {
    logger.error('API Translation failed', { error: err.message });
    res.status(500).json({ error: 'Translation service error' });
  }
});

// Service metadata
app.get('/api/metadata', (req, res) => {
  try {
    res.json({
      service: process.env.K_SERVICE || 'voterverse-backend',
      revision: process.env.K_REVISION || '1.0.0',
      platform: process.env.K_SERVICE ? 'Google Cloud Run' : 'Local Development',
      infra: {
        database: db.getMode(),
        ai: process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'mock',
        maps: process.env.MAPS_API_KEY ? 'enabled' : 'disabled',
        gcs: process.env.GCS_REPORTS_BUCKET ? 'enabled' : 'simulation',
        ga4: process.env.GA4_MEASUREMENT_ID ? 'enabled' : 'disabled',
      },
    });
  } catch (err) {
    logger.error('Metadata endpoint failed', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Election timeline
app.get('/api/timeline', async (req, res) => {
  try {
    const timeline = await db.getTimeline();
    logger.info('Timeline fetched', { steps: timeline.length });
    res.json({ timeline });
  } catch (err) {
    logger.error('Timeline fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Document analysis (Gemini Vision) — larger body limit for base64 images
// PRIVACY: Image processed in-memory only, never stored or logged
app.post('/api/document/analyze', express.json({ limit: '8mb' }), async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Validate image size (approximate: base64 is ~4/3 of original)
    const approximateSize = (imageBase64.length * 3) / 4;
    if (approximateSize > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size exceeds 5MB limit' });
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mime = mimeType || 'image/jpeg';
    if (!validMimeTypes.includes(mime)) {
      return res.status(400).json({ error: 'Invalid mime type. Supported: jpeg, png, webp, gif' });
    }

    // PRIVACY: Image processed in-memory only, never stored or logged
    const analysis = await ai.analyzeElectionDocument(imageBase64, mime);
    logger.info('Document analyzed', { documentType: analysis.document_type });

    res.json({ analysis });
  } catch (err) {
    logger.error('Document analysis failed', { error: err.message });
    res.status(500).json({ error: 'Document analysis failed' });
  }
});

// Quiz question generation
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const topic = sanitize(req.body.topic || 'general', 200);
    const question = await ai.generateQuizQuestion(topic);
    logger.info('Quiz question generated', { topic });
    res.json({ question });
  } catch (err) {
    logger.error('Quiz generation failed', { error: err.message });
    res.status(500).json({ error: 'Quiz generation failed' });
  }
});

// ─── Chat API ───

// Get chat history
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const sessionId = sanitize(req.params.sessionId, 100);
    const history = await db.getConversation(sessionId);
    res.json({ history });
  } catch (err) {
    logger.error('Chat history fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Clear chat history
app.delete('/api/chat/:sessionId', async (req, res) => {
  try {
    const sessionId = sanitize(req.params.sessionId, 100);
    await db.clearConversation(sessionId);
    res.json({ status: 'cleared' });
  } catch (err) {
    logger.error('Chat clear failed', { error: err.message });
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// Stream chat response — strict rate limiter to prevent Gemini API abuse
app.post('/api/chat/stream', chatLimiter, async (req, res) => {
  try {
    const sessionId = sanitize(req.body.sessionId, 100);
    const message = sanitize(req.body.message, 1000);
    const topic = sanitize(req.body.topic || '', 100);

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Append user message
    const history = await db.appendMessage(sessionId, { role: 'user', content: message });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // CRITICAL: Disables buffering on Google Cloud Run
    res.flushHeaders();

    let fullModelResponse = '';
    let suggestions = [];

    // Stream from AI service
    const stream = ai.streamChatResponse(message, history.slice(0, -1), topic); // Pass history excluding current message
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullModelResponse += chunk.chunk;
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.chunk })}\n\n`);
      } else if (chunk.type === 'suggestions') {
        suggestions = chunk.suggestions;
        res.write(`data: ${JSON.stringify({ type: 'suggestions', content: chunk.suggestions })}\n\n`);
      }
    }

    // Save model response to DB
    await db.appendMessage(sessionId, { role: 'model', content: fullModelResponse });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    logger.error('Chat stream failed', { error: err.message });
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate response' })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/fraud/report
 * Submits a new fraud report, classifies it with AI, and saves to GCS.
 */
app.post('/api/fraud/report', async (req, res) => {
  try {
    const description = sanitize(req.body.description, 1000);
    const location = sanitize(req.body.location, 500);
    const fraudType = sanitize(req.body.fraudType, 50);
    const evidence = req.body.evidence; // base64 image, optional

    // 1. Basic Validation
    const validation = validateFraudReport({ description, location, fraudType });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('; ') });
    }

    // 2. Evidence size check
    if (evidence && (evidence.length * 3) / 4 > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Evidence image exceeds 5MB limit' });
    }

    // 3. AI Classification
    const classification = await ai.classifyFraudReport(description);
    const reportId = generateReportId();

    // 4. Persistent Storage (GCS)
    const storageResult = await storage.uploadReportSummary(reportId, {
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      location,
      reportedAs: fraudType
    });

    // 5. Database Save
    await db.saveReport(reportId, {
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      recommended_action: classification.recommended_action,
      eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
      location,
      reportedFraudType: fraudType || classification.fraud_type,
      status: 'submitted',
    });

    logger.info('Fraud report processed', { reportId, type: classification.fraud_type });

    res.json({
      reportId,
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      recommended_action: classification.recommended_action,
      eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
      evidenceStatus: storageResult ? 'persisted' : 'local_only',
      status: 'submitted',
    });
  } catch (err) {
    logger.error('Fraud report submission failed', { error: err.message });
    res.status(500).json({ error: 'Fraud report submission failed' });
  }
});

// Transparency dashboard — public anonymized reports
app.get('/api/fraud/reports', async (req, res) => {
  try {
    const reports = await db.getReports();
    // Ensure anonymized: only return classification data
    const anonymized = reports.map((r) => ({
      reportId: r.id,
      fraud_type: r.fraud_type,
      severity: r.severity,
      location: r.location,
      status: r.status,
      createdAt: r.createdAt,
    }));
    res.json({ reports: anonymized });
  } catch (err) {
    logger.error('Fraud reports fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Seed mock data for demo
app.post('/api/simulate', async (req, res) => {
  try {
    const mockReports = [
      {
        fraud_type: 'vote_buying',
        severity: 'high',
        recommended_action: 'Report via cVIGIL app immediately',
        eci_reference: 'ECI Helpline: 1950',
        location: 'Mumbai North, Maharashtra',
        reportedFraudType: 'vote_buying',
        status: 'under_review',
      },
      {
        fraud_type: 'impersonation',
        severity: 'critical',
        recommended_action: 'Alert Presiding Officer at the booth immediately',
        eci_reference: 'Section 171D IPC — Impersonation at Elections',
        location: 'New Delhi, Delhi',
        reportedFraudType: 'impersonation',
        status: 'investigating',
      },
      {
        fraud_type: 'intimidation',
        severity: 'medium',
        recommended_action: 'Contact nearest police station and call 1950',
        eci_reference: 'Section 171C IPC — Undue Influence at Elections',
        location: 'Lucknow, Uttar Pradesh',
        reportedFraudType: 'intimidation',
        status: 'resolved',
      },
    ];

    for (const report of mockReports) {
      const id = generateReportId();
      await db.saveReport(id, report);
    }

    logger.info('Mock data seeded', { reports: mockReports.length });
    res.json({ message: 'Mock data seeded successfully', count: mockReports.length });
  } catch (err) {
    logger.error('Simulation failed', { error: err.message });
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * POST /api/report/export
 * Exports all reports to a CSV file in Google Cloud Storage.
 */
app.post('/api/report/export', async (req, res) => {
  try {
    const reports = await db.getReports();
    if (reports.length === 0) {
      return res.json({ message: 'No reports to export', exported: 0 });
    }

    const fileName = await storage.exportToCSV(reports);
    
    if (fileName) {
      res.json({
        message: 'Reports exported to Google Cloud Storage',
        fileName,
        exported: reports.length,
      });
    } else {
      res.status(500).json({ error: 'Export failed' });
    }
  } catch (err) {
    logger.error('Report export failed', { error: err.message });
    res.status(500).json({ error: 'Report export failed' });
  }
});

// ─── Serve Frontend (production) ───
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <head><title>VoterVerse</title></head>
          <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#0f1117;color:#e8eaf6">
            <div style="text-align:center">
              <h1>🗳️ VoterVerse</h1>
              <p>Backend is running. Frontend not built yet.</p>
              <p>Run <code>npm run build --prefix frontend</code> or <code>npm run dev</code> for development.</p>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// ─── Start Server ───
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`VoterVerse server started on port ${PORT}`, {
      mode: db.getMode(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });
  });
}

module.exports = app;
