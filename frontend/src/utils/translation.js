/**
 * VoterVerse — Frontend Translation Utility
 * Connects to the backend translation service.
 */

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
];

/**
 * Translates a given text using the backend API
 * @param {string} text - Text to translate
 * @param {string} targetLang - ISO-639-1 code
 * @returns {Promise<string>} Translated text
 */
async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    
    if (!response.ok) throw new Error('Translation failed');
    const data = await response.json();
    return data.translated;
  } catch (err) {
    console.error('Frontend translation error:', err);
    return text;
  }
}

export { SUPPORTED_LANGUAGES, translateText };
