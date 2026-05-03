const express = require('express');
const router = express.Router();
const db = require('../database');
const { successResponse } = require('../utils/responseWrapper');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Returns the health status of the service
 *     responses:
 *       200:
 *         description: Health status object
 */
router.get('/health', async (req, res, next) => {
  try {
    res.json(
      successResponse({
        status: 'ok',
        firebase: db.getMode() === 'firebase',
        mode: db.getMode(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Returns client-side configuration
 *     description: Provides API keys and identifiers needed by the frontend.
 *     responses:
 *       200:
 *         description: Configuration object
 */
router.get('/config', (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.json(
      successResponse({
        mapsApiKey: process.env.MAPS_API_KEY || '',
        ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
      })
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/metadata:
 *   get:
 *     summary: Returns service metadata
 *     description: Provides information about the running environment and integrated Google services status.
 *     responses:
 *       200:
 *         description: Service metadata
 */
router.get('/metadata', (req, res, next) => {
  try {
    res.json(
      successResponse({
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
      })
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
