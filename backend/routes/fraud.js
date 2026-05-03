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
    const description = sanitize(req.body.description, 1000);
    const location = sanitize(req.body.location, 500);
    const fraudType = sanitize(req.body.fraudType, 50);
    const evidence = req.body.evidence;

    const validation = validateFraudReport({ description, location, fraudType });
    if (!validation.valid) {
      return res.status(400).json(errorResponse(validation.errors.join('; ')));
    }

    if (evidence && (evidence.length * 3) / 4 > 5 * 1024 * 1024) {
      return res.status(400).json(errorResponse('Evidence image exceeds 5MB limit'));
    }

    const classification = await ai.classifyFraudReport(description);
    const reportId = generateReportId();

    const storageResult = await storage.uploadReportSummary(reportId, {
      fraud_type: classification.fraud_type,
      severity: classification.severity,
      location,
      reportedAs: fraudType,
    });

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

    res.json(
      successResponse({
        reportId,
        fraud_type: classification.fraud_type,
        severity: classification.severity,
        recommended_action: classification.recommended_action,
        eci_reference: classification.eci_reference || 'ECI Helpline: 1950',
        evidenceStatus: storageResult ? 'persisted' : 'local_only',
        status: 'submitted',
      })
    );
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
