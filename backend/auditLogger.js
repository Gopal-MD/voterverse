/**
 * VoterVerse — Structured Audit Logger
 * Google Cloud Logging abstraction — structured JSON to stdout
 * Cloud Run captures this via Cloud Log Explorer automatically
 */

function auditLog(severity, message, payload = {}) {
  const entry = {
    severity,
    message,
    ...payload,
    serviceContext: {
      service: process.env.K_SERVICE || 'voterverse-backend',
      version: process.env.K_REVISION || '1.0.0',
    },
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
}

const logger = {
  info: (msg, data) => auditLog('INFO', msg, data),
  warn: (msg, data) => auditLog('WARNING', msg, data),
  error: (msg, data) => auditLog('ERROR', msg, data),
};

module.exports = logger;
