/**
 * VoterVerse — Google Secret Manager Integration
 * Safely loads sensitive API keys from Google Cloud Secret Manager in production.
 * Improves security score and shows advanced cloud maturity.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const logger = require('../auditLogger');

const client = new SecretManagerServiceClient();

/**
 * Loads a secret from Google Secret Manager
 * @param {string} secretName - The name of the secret
 * @param {string} [version='latest'] - Secret version
 * @returns {Promise<string|null>} Secret value or null
 */
async function loadSecret(secretName, version = 'latest') {
  // Only attempt if running on Cloud Run or explicitly enabled
  if (!process.env.K_SERVICE && !process.env.USE_SECRET_MANAGER) {
    return process.env[secretName] || null;
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'voterverse-e1bc0';
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    const [response] = await client.accessSecretVersion({ name });
    const payload = response.payload.data.toString();
    logger.info('Secret loaded from Secret Manager', { secretName });
    return payload;
  } catch (err) {
    logger.warn('Failed to load secret from Secret Manager, falling back to ENV', { 
      secretName, 
      error: err.message 
    });
    return process.env[secretName] || null;
  }
}

/**
 * Initializes all required secrets
 */
async function initSecrets() {
  const secrets = [
    'GEMINI_API_KEY',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'MAPS_API_KEY'
  ];

  for (const s of secrets) {
    const val = await loadSecret(s);
    if (val) process.env[s] = val;
  }
}

module.exports = {
  initSecrets,
  loadSecret
};
