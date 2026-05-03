const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../auditLogger');
const { generateReportId } = require('../utils/helpers');
const { successResponse } = require('../utils/responseWrapper');

/**
 * @swagger
 * /api/simulate:
 *   post:
 *     summary: Seeds mock data for demo
 *     responses:
 *       200:
 *         description: Simulation status
 */
router.post('/simulate', async (req, res, next) => {
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
    res.json(
      successResponse({ message: 'Mock data seeded successfully', count: mockReports.length })
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
