/**
 * VoterVerse — Google Cloud Storage Service
 * Handles persistence of report summaries and evidence files.
 * Provides separation of concerns and robust error handling.
 */

const { Storage } = require('@google-cloud/storage');
const logger = require('./auditLogger');

let storage;
const bucketName = process.env.GCS_REPORTS_BUCKET || 'voterverse-reports';

/**
 * Initialize GCS Client
 */
function initStorage() {
  if (storage) return true;
  // If no credentials and not in production, we run in simulation mode
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PRIVATE_KEY && !process.env.K_SERVICE) {
    logger.info('Storage running in SIMULATION mode');
    return false;
  }
  try {
    storage = new Storage();
    return true;
  } catch (err) {
    logger.error('Failed to init Storage Client', { error: err.message });
    return false;
  }
}

/**
 * Upload an anonymized report summary or evidence summary
 * @param {string} reportId - Unique report identifier
 * @param {object} data - Report data to save
 * @returns {Promise<boolean>} Success status
 */
async function uploadReportSummary(reportId, data) {
  if (!initStorage()) {
    logger.info('Simulation: Would upload report summary to GCS', { reportId });
    return true;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`reports/${reportId}.summary.json`);
    
    await file.save(JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      platform: 'VoterVerse'
    }), {
      contentType: 'application/json',
      resumable: false,
    });

    logger.info('Report summary saved to GCS', { reportId });
    return true;
  } catch (err) {
    logger.error('GCS Upload failed', { error: err.message, reportId });
    return false;
  }
}

/**
 * Exports all reports to a CSV file in GCS
 * @param {Array} reports - List of reports to export
 * @returns {Promise<string|null>} Filename if successful
 */
async function exportToCSV(reports) {
  if (reports.length === 0) return null;

  const headers = 'ReportID,FraudType,Severity,Location,Status,CreatedAt\n';
  const rows = reports
    .map(r => `${r.id},${r.fraud_type},${r.severity},"${r.location || ''}",${r.status},${r.createdAt}`)
    .join('\n');
  const csv = headers + rows;

  const fileName = `exports/fraud-reports-${new Date().toISOString().split('T')[0]}.csv`;

  if (!initStorage()) {
    logger.info('Simulation: Would export reports to GCS CSV', { count: reports.length });
    return fileName;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    await file.save(csv, { contentType: 'text/csv' });
    logger.info('Reports exported to GCS', { fileName, count: reports.length });
    return fileName;
  } catch (err) {
    logger.error('GCS Export failed', { error: err.message });
    return null;
  }
}

module.exports = {
  uploadReportSummary,
  exportToCSV,
};
