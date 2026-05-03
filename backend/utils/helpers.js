const crypto = require('crypto');

/**
 * Helper: Sanitize and escape user input to prevent XSS.
 * @param {string} str - Input string
 * @param {number} [maxLen=1000] - Maximum allowed length
 * @returns
 * @throws {Error} None
 */
const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

function sanitize(str, maxLen = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .substring(0, maxLen)
    .replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

/**
 * Retry helper for transient failures.
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delayMs - Delay between retries (ms)
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransient = err.code === 'ECONNREFUSED' || err.status === 503 || err.status === 429;
      if (attempt === maxAttempts || !isTransient) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * Helper: Generate a unique report ID with timestamp and entropy.
 * @returns {string}
 */
function generateReportId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `VV-${timestamp}-${random}`;
}

module.exports = {
  sanitize,
  generateReportId,
  withRetry,
};
