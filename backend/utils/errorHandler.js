/**
 * Global Error Handling Middleware
 * Catches all unhandled synchronous and asynchronous errors in the Express pipeline.
 * Ensures that no stack traces leak to the client in production and that the API contract is maintained.
 * 
 * @module errorHandler
 */

const logger = require('../auditLogger');
const { errorResponse } = require('./responseWrapper');

/**
 * Express error handling middleware.
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns 
 * @throws {Error} None
 */
function globalErrorHandler(err, req, res, next) {
  // Log the error securely with auditLogger (scrubs PII automatically if configured)
  logger.error('Unhandled Server Error', { 
    message: err.message, 
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    path: req.path,
    method: req.method
  });

  // Default to 500 if status code is not already set by earlier middleware
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json(errorResponse(
    process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message
  ));
}

module.exports = globalErrorHandler;
