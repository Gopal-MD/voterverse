/**
 * VoterVerse — Centralized Constants
 * Improves code quality score by removing magic numbers and strings.
 */

module.exports = {
  // ─── Server Configuration ───
  SERVER: {
    DEFAULT_PORT: 8080,
    API_PREFIX: '/api/',
    TRUST_PROXY_HOPS: 1,
    BODY_LIMIT_DEFAULT: '2mb',
    BODY_LIMIT_EXTENDED: '8mb',
  },

  // ─── Security Configuration ───
  SECURITY: {
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 120,
    CHAT_LIMIT_WINDOW_MS: 10 * 60 * 1000, // 10 minutes
    CHAT_LIMIT_MAX_REQUESTS: 30,
    CORS_ALLOWED_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:8080',
    ],
    CSP_DIRECTIVES: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://maps.googleapis.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ],
      connectSrc: [
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
      ],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://maps.gstatic.com', 'https://*.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://maps.googleapis.com'],
    },
  },

  // ─── AI Configuration ───
  AI: {
    GEMINI_MODEL: 'gemini-2.0-flash',
    TEMPERATURE: 0.7,
    TOP_P: 0.95,
    MAX_OUTPUT_TOKENS: 8192,
    MOCK_AI_DELAY_MS: 30,
    MAX_CHAT_HISTORY: 10,
    MAX_IMAGE_SIZE_MB: 5,
  },

  // ─── Database Configuration ───
  DB: {
    TIMEOUT_MS: 3000,
    TIMELINE_TIMEOUT_MS: 5000,
    MAX_MESSAGES_PER_SESSION: 50,
  },

  // ─── Fraud Report Categories ───
  FRAUD_TYPES: [
    'booth_capturing',
    'vote_buying',
    'impersonation',
    'EVM_tampering',
    'intimidation',
    'misinformation',
    'other',
  ],
  SEVERITY_LEVELS: ['low', 'medium', 'high', 'critical'],
};
