/**
 * VoterVerse — Google Cloud Translation Service
 * Provides multi-language support for regional voters.
 * Features: Automatic language detection and translation of AI responses.
 */

const { TranslationServiceClient } = require('@google-cloud/translate');
const logger = require('./auditLogger');

let translationClient;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'voterverse-e1bc0';
const location = 'global';

/**
 * Initialize Translation Client
 */
function initTranslate() {
  if (translationClient) return true;
  // If no credentials, we run in mock mode
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PRIVATE_KEY) {
    logger.info('Translation running in MOCK mode (no credentials)');
    return false;
  }
  try {
    translationClient = new TranslationServiceClient();
    return true;
  } catch (err) {
    logger.error('Failed to init Translation Client', { error: err.message });
    return false;
  }
}

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - ISO-639-1 code (e.g., 'hi', 'te', 'bn')
 * @returns {Promise<string>} Translated text
 */
async function translateText(text, targetLanguage) {
  if (!text || targetLanguage === 'en') return text;
  
  if (!initTranslate()) {
    // Mock translation: Append [Translated to {lang}]
    return `[Mock ${targetLanguage.toUpperCase()}] ${text}`;
  }

  try {
    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    };

    const [response] = await translationClient.translateText(request);
    return response.translations[0].translatedText;
  } catch (err) {
    logger.error('Translation failed', { error: err.message, targetLanguage });
    return text; // Fallback to original English
  }
}

module.exports = {
  translateText,
};
