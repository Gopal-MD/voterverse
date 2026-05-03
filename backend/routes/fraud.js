const express = require('express');
const router = express.Router();
const db = require('../database');
const ai = require('../aiService');
const storage = require('../storageService');
const logger = require('../auditLogger');
const { sanitize, generateReportId } = require('../utils/helpers');
const { validateFraudReport } = require('../cloud-functions/mockFunctions');
const { successResponse, errorResponse } = require('../utils/responseWrapper');

/**
 * Validates fraud report payload.
 * @param {object} payload - Request body
 * @returns {object} { valid: boolean, error?: string }
 */
function validateFraudReportPayload(payload) {
  const { description, location, fraudType, evidence } = payload;
  const validation = validateFraudReport({ description, location, fraudType });
  if (!validation.valid) {
    return { valid: false, error: validation.errors.join('; ') };
  }
  if (evidence && (evidence.length * 3) / 4 > 5 * 1024 * 1024) {
    return { valid: false, error: 'Evidence image exceeds 5MB limit' };
  }
  return { valid: true };
}

/**
 * Processes a fraud report submission.
 * @param {object} payload - Sanitized report data
 * @returns {Promise<object>} Report result
 */
async function processFraudReport(payload) {
  const { description, location, fraudType, evidence } = payload;
  const classification = await ai.classifyFraudReport(description);
  const reportId = generateReportId();

  const storageResult = await storage.uploadReportSummary(reportId, {
    fraud_type: classification.fraud_type,
    severity: classification.severity,
    location,
    reportedAs: fraudType,
  });

  const result = {
    reportId,
    fraud_type: classification.fraud_type,
    severity: classification.severity,
    recommended_action: classification.recommended_action,
    eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
    location,
    reportedFraudType: fraudType || classification.fraud_type,
    status: 'submitted',
  };

  await db.saveReport(reportId, result);
  logger.info('Fraud report processed', { reportId, type: classification.fraud_type });

  return {
    ...result,
    evidenceStatus: storageResult ? 'persisted' : 'local_only',
  };
}

/**
 * @swagger
 * /api/fraud/report:
 *   post:
 *     summary: Submits a new fraud report
 *     responses:
 *       200:
 *         description: Report summary
 */
router.post('/report', async (req, res, next) => {
  try {
    const payload = {
      description: sanitize(req.body.description, 1000),
      location: sanitize(req.body.location, 500),
      fraudType: sanitize(req.body.fraudType, 50),
      evidence: req.body.evidence,
    };

    const validation = validateFraudReportPayload(payload);
    if (!validation.valid) {
      return res.status(400).json(errorResponse(validation.error));
    }

    const result = await processFraudReport(payload);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/fraud/reports:
 *   get:
 *     summary: Returns public anonymized reports
 *     responses:
 *       200:
 *         description: Array of reports
 */
router.get('/reports', async (req, res, next) => {
  try {
    const reports = await db.getReports();
    const anonymized = reports.map((r) => ({
      reportId: r.id,
      fraud_type: r.fraud_type,
      severity: r.severity,
      location: r.location,
      status: r.status,
      createdAt: r.createdAt,
    }));
    res.json(successResponse({ reports: anonymized }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
