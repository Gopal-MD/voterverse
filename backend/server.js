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
const logger = require('./auditLogger');
const db = require('./database');
const ai = require('./aiService');
const { validateFraudReport } = require('./cloud-functions/mockFunctions');

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Security Middleware ───

// Helmet with custom CSP whitelisting Google APIs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://maps.googleapis.com',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://www.google-analytics.com',
          'https://analytics.google.com',
        ],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://maps.gstatic.com', 'https://*.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'https://maps.googleapis.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Disable x-powered-by
app.disable('x-powered-by');

// CORS whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  process.env.CLOUD_RUN_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // In development, allow all; tighten in production
      }
    },
    credentials: true,
  })
);

// Rate limiting: 100 requests per 15 minutes per IP on /api/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Helper: sanitize user input ───
function sanitize(str, maxLen = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLen);
}

// ─── Helper: generate HMAC-style report ID ───
function generateReportId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `VV-${timestamp}-${random}`;
}

// ─── API Routes ───

// Health check
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

// Runtime config for frontend (maps key injection)
app.get('/api/config', (req, res) => {
  try {
    res.json({
      mapsApiKey: process.env.MAPS_API_KEY || '',
      ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
    });
  } catch (err) {
    logger.error('Config endpoint failed', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
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

// Document analysis (Gemini Vision)
// PRIVACY: Image processed in-memory only, never stored or logged
app.post('/api/document/analyze', async (req, res) => {
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

// Fraud report submission
app.post('/api/fraud/report', async (req, res) => {
  try {
    const description = sanitize(req.body.description, 1000);
    const location = sanitize(req.body.location, 500);
    const fraudType = sanitize(req.body.fraudType, 50);
    const evidence = req.body.evidence; // base64 image, optional

    // Validate
    const validation = validateFraudReport({ description, location, fraudType });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('; ') });
    }

    // Validate evidence size if provided
    if (evidence) {
      const approxSize = (evidence.length * 3) / 4;
      if (approxSize > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Evidence image exceeds 5MB limit' });
      }
    }

    // AI classification
    const classification = await ai.classifyFraudReport(description);

    // Generate HMAC-style report ID
    const reportId = generateReportId();

    // Save anonymized report (no PII, no images)
    await db.saveReport(reportId, {
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      recommended_action: classification.recommended_action,
      eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
      location,
      reportedFraudType: fraudType || classification.fraud_type,
      status: 'submitted',
    });

    // Handle evidence upload to GCS (simulation in dev)
    let evidenceStatus = 'none';
    if (evidence) {
      if (process.env.K_SERVICE && process.env.GCS_REPORTS_BUCKET) {
        try {
          const { Storage } = require('@google-cloud/storage');
          const storage = new Storage();
          const bucket = storage.bucket(process.env.GCS_REPORTS_BUCKET);
          const file = bucket.file(`evidence/${reportId}.summary.txt`);
          await file.save(
            `Report: ${reportId}\nType: ${classification.fraud_type}\nSeverity: ${classification.severity}\nLocation: ${location}\nTimestamp: ${new Date().toISOString()}`
          );
          evidenceStatus = 'uploaded_to_gcs';
          logger.info('Evidence summary uploaded to GCS', { reportId });
        } catch (gcsErr) {
          logger.error('GCS upload failed', { error: gcsErr.message });
          evidenceStatus = 'gcs_upload_failed';
        }
      } else {
        logger.info('Simulation: would upload evidence summary to GCS', { reportId });
        evidenceStatus = 'simulated';
      }
    }

    logger.info('Fraud report submitted', {
      reportId,
      fraudType: classification.fraud_type,
      severity: classification.severity,
    });

    res.json({
      reportId,
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      recommended_action: classification.recommended_action,
      eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
      evidenceStatus,
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

// Export fraud reports to GCS (CSV)
app.post('/api/report/export', async (req, res) => {
  try {
    const reports = await db.getReports();

    if (reports.length === 0) {
      return res.json({ message: 'No reports to export', exported: 0 });
    }

    // Generate CSV
    const headers = 'ReportID,FraudType,Severity,Location,Status,CreatedAt\n';
    const rows = reports
      .map(
        (r) =>
          `${r.id},${r.fraud_type},${r.severity},"${r.location || ''}",${r.status},${r.createdAt}`
      )
      .join('\n');
    const csv = headers + rows;

    if (process.env.K_SERVICE && process.env.GCS_REPORTS_BUCKET) {
      try {
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(process.env.GCS_REPORTS_BUCKET);
        const fileName = `exports/fraud-reports-${new Date().toISOString().split('T')[0]}.csv`;
        const file = bucket.file(fileName);
        await file.save(csv, { contentType: 'text/csv' });
        logger.info('Reports exported to GCS', { fileName, count: reports.length });
        res.json({
          message: 'Reports exported to Google Cloud Storage',
          fileName,
          exported: reports.length,
        });
      } catch (gcsErr) {
        logger.error('GCS export failed', { error: gcsErr.message });
        res.json({
          message: 'Simulation: would export to GCS (GCS error)',
          exported: reports.length,
          csv_preview: csv.substring(0, 500),
        });
      }
    } else {
      logger.info('Simulation: would export reports to GCS', { count: reports.length });
      res.json({
        message: 'Simulation: would export to GCS bucket',
        exported: reports.length,
        csv_preview: csv.substring(0, 500),
      });
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
