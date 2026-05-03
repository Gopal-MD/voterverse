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
 * Helper: Generate a unique report ID with timestamp and entropy.
 * @returns
 * @throws {Error} None
 */
function generateReportId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `VV-${timestamp}-${random}`;
}

module.exports = {
  sanitize,
  generateReportId,
};
