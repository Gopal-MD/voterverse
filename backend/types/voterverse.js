/**
 * VoterVerse Type Definitions
 * Provides IDE support and structural validation for core models.
 */

/**
 * @typedef {Object} VoterReport
 * @property {string} id - Unique identifier
 * @property {('booth_capturing'|'vote_buying'|'impersonation'|'EVM_tampering'|'intimidation'|'misinformation'|'other')} fraud_type
 * @property {('low'|'medium'|'high'|'critical')} severity
 * @property {string} recommended_action - Steps for the citizen to take
 * @property {string} eci_reference - Official ECI guideline or helpline
 * @property {string} [location] - Location of incident
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} ChatMessage
 * @property {('user'|'model'|'system')} role
 * @property {string} content
 * @property {string} [timestamp]
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} question
 * @property {string[]} options - Exactly 4 options
 * @property {number} correct_index - 0-3
 * @property {string} explanation
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success
 * @property {any} [data]
 * @property {string} [error]
 */

module.exports = {};
