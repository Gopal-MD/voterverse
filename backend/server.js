/**
 * VoterVerse — Express Backend Server
 * Refactored for Enterprise Standards:
 * - Centralized Routing
 * - Global Error Handling
 * - Fail-Fast Environment Validation
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const constants = require('./config/constants');
const logger = require('./auditLogger');
const validateEnv = require('./utils/validateEnv');
const globalErrorHandler = require('./utils/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

// ─── 1. Fail-Fast Environment Validation ───
validateEnv();

const app = express();
const PORT = process.env.PORT || constants.SERVER.DEFAULT_PORT;

// ─── 2. Security Middleware ───
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: constants.SECURITY.CSP_DIRECTIVES,
    },
  })
);
app.use(cors({ origin: constants.SECURITY.CORS_ALLOWED_ORIGINS }));
app.use(constants.SERVER.API_PREFIX, apiLimiter);

// ─── 3. Global Body Parsing ───
app.use(express.json({ limit: constants.SERVER.BODY_LIMIT_DEFAULT }));
app.use(express.urlencoded({ extended: true, limit: constants.SERVER.BODY_LIMIT_DEFAULT }));

// ─── 4. Swagger Documentation ───
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VoterVerse API',
      version: '1.2.0',
      description: 'Interactive API Documentation for the VoterVerse platform.',
      contact: { name: 'VoterVerse Engineering' },
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Local Server' },
      {
        url: 'https://voterverse-442905020232.asia-south1.run.app/',
        description: 'Production Server',
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'], // Scan both for documentation
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── 5. API Routes ───
app.use('/api', require('./routes/system'));
app.use('/api', require('./routes/election'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/fraud', require('./routes/fraud'));
app.use('/api', require('./routes/simulation'));
app.use('/api/report', require('./routes/export'));

// ─── 6. Cloud Run Liveness Probe (Direct) ───
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ─── 7. Global Error Handler ───
app.use(globalErrorHandler);

// ─── 8. Frontend Static Serving & SPA Fallback ───
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, data: null, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('VoterVerse Backend is running. Frontend not built.');
    }
  });
});

// ─── 9. Start Server ───
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`VoterVerse server started on port ${PORT}`, {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });
  });
}

module.exports = app;
