const rateLimit = require('express-rate-limit');
const constants = require('../config/constants');
const { errorResponse } = require('../utils/responseWrapper');

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: constants.SECURITY.RATE_LIMIT_WINDOW_MS,
  max: constants.SECURITY.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many requests, please try again later.'),
});

/**
 * Specialized Rate Limiter for AI Chat
 */
const chatLimiter = rateLimit({
  windowMs: constants.SECURITY.CHAT_LIMIT_WINDOW_MS,
  max: constants.SECURITY.CHAT_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Chat rate limit exceeded. Please wait a moment.'),
});

module.exports = {
  apiLimiter,
  chatLimiter,
};
