/**
 * Standard API Response Wrapper
 * Ensures a consistent JSON structure for all client-facing API responses.
 * 
 * @module responseWrapper
 */

/**
 * Creates a standardized success response.
 * @param {object|array|string|number} data - The payload to send to the client.
 * @returns 
 * @throws {Error} None
 */
function successResponse(data) {
  return {
    success: true,
    data,
    error: null
  };
}

/**
 * Creates a standardized error response.
 * @param {string} message - The error message to send to the client.
 * @returns 
 * @throws {Error} None
 */
function errorResponse(message) {
  return {
    success: false,
    data: null,
    error: message
  };
}

module.exports = {
  successResponse,
  errorResponse
};
