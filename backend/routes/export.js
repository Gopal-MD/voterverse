const express = require('express');
const router = express.Router();
const db = require('../database');
const storage = require('../storageService');
const logger = require('../auditLogger');
const { successResponse, errorResponse } = require('../utils/responseWrapper');

/**
 * @swagger
 * /api/report/export:
 *   post:
 *     summary: Exports all reports to a CSV file in Google Cloud Storage
 *     responses:
 *       200:
 *         description: Export result
 */
router.post('/export', async (req, res, next) => {
  try {
    const reports = await db.getReports();
    if (reports.length === 0) {
      return res.json(successResponse({ message: 'No reports to export', exported: 0 }));
    }

    const fileName = await storage.exportToCSV(reports);

    if (fileName) {
      res.json(
        successResponse({
          message: 'Reports exported to Google Cloud Storage',
          fileName,
          exported: reports.length,
        })
      );
    } else {
      res.status(500).json(errorResponse('Export failed'));
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
