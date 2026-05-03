/**
 * VoterVerse — Structured Audit Logger
 * Google Cloud Logging abstraction — structured JSON to stdout
 * Cloud Run captures this via Cloud Log Explorer automatically.
 * - Supports severity levels, request IDs, and automatic PII scrubbing.
 */

const PII_KEYS = ['email', 'phone', 'name', 'password', 'token', 'privateKey', 'PRIVATE_KEY'];

/**
 * Recursively removes sensitive keys from a payload object before logging.
 * @param {object} obj
 * @returns {object}
 */
function scrubPII(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (PII_KEYS.some((key) => k.toLowerCase().includes(key.toLowerCase()))) {
        return [k, '[REDACTED]'];
      }
      return [k, typeof v === 'object' ? scrubPII(v) : v];
    })
  );
}

/**
 * Formats and writes a structured log entry to stdout/stderr.
 * @param {('INFO'|'WARNING'|'ERROR'|'CRITICAL'|'DEBUG')} severity - Log severity
 * @param {string} message - Human readable message
 * @param {object} [payload={}] - Additional structured data
 */
function auditLog(severity, message, payload = {}) {
  const entry = {
    severity,
    message,
    ...scrubPII(payload),
    serviceContext: {
      service: process.env.K_SERVICE || 'voterverse-backend',
      version: process.env.K_REVISION || '1.0.0',
    },
    timestamp: new Date().toISOString(),
  };
  // Use stderr for errors so Cloud Run can route them correctly
  if (severity === 'ERROR' || severity === 'CRITICAL') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

const logger = {
  info: (msg, data) => auditLog('INFO', msg, data),
  warn: (msg, data) => auditLog('WARNING', msg, data),
  error: (msg, data) => auditLog('ERROR', msg, data),
  critical: (msg, data) => auditLog('CRITICAL', msg, data),
  debug: (msg, data) => {
    if (process.env.NODE_ENV !== 'production') auditLog('DEBUG', msg, data);
  },
};

module.exports = logger;
