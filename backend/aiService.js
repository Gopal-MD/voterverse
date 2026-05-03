/**
 * VoterVerse — AI Service (Gemini 2.0 Flash)
 * Handles document analysis, quiz generation, and chat streaming.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./auditLogger');
const constants = require('./config/constants');
const functionDeclarations = require('./config/aiTools.js');
const MOCK_RESPONSES = require('./config/aiMocks.js');

let genAI;
let model;
let quizIndex = 0;

/**
 * Initializes the Gemini AI client if a key is available.
 */
function initGemini() {
  if (genAI) return;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    logger.warn('GEMINI_API_KEY missing; using MOCK AI service');
    return;
  }
  genAI = new GoogleGenerativeAI(key);
  model = genAI.getGenerativeModel({
    model: constants.AI.GEMINI_MODEL,
    tools: [{ functionDeclarations }],
    generationConfig: {
      temperature: constants.AI.TEMPERATURE,
      topP: constants.AI.TOP_P,
      maxOutputTokens: constants.AI.MAX_OUTPUT_TOKENS,
    },
  });
}

/**
 * Extracts function call arguments from a Gemini response.
 * @param {object} response - Gemini API response
 * @param {string} expectedName - Expected function name
 * @returns {object|null} Arguments or null
 */
function extractFunctionCall(response, expectedName) {
  try {
    const candidate = response.response.candidates[0];
    const parts = candidate.content.parts;
    for (const part of parts) {
      if (part.functionCall && part.functionCall.name === expectedName) {
        return part.functionCall.args;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Analyze an election document using Gemini Vision.
 * @param {string} base64Image - Image data in base64 format
 * @param {string} [mimeType='image/jpeg'] - Image MIME type
 * @returns {Promise<object>} Analysis result
 * @throws {Error} If analysis fails and no fallback exists
 */
async function analyzeElectionDocument(base64Image, mimeType = 'image/jpeg') {
  initGemini();
  if (!model) return { ...MOCK_RESPONSES.document, _mock: true };

  try {
    const prompt = `Analyze this election document. Use explain_election_document.`;
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Image } },
    ]);
    const fnResult = extractFunctionCall(result, 'explain_election_document');
    return fnResult || { ...MOCK_RESPONSES.document, _fallback: true };
  } catch (err) {
    logger.error('Gemini Vision failed', { error: err.message });
    return { ...MOCK_RESPONSES.document, _error: err.message };
  }
}

/**
 * Generate a quiz question about the election process.
 * @param {string} [topic='general'] - Quiz topic
 * @returns {Promise<object>} Quiz question
 */
async function generateQuizQuestion(topic = 'general') {
  initGemini();
  if (!model) {
    const q = MOCK_RESPONSES.quiz[quizIndex % MOCK_RESPONSES.quiz.length];
    quizIndex++;
    return { ...q, _mock: true };
  }

  try {
    const prompt = `Generate a quiz question about: "${topic}". Use generate_quiz_question.`;
    const result = await model.generateContent(prompt);
    const fnResult = extractFunctionCall(result, 'generate_quiz_question');
    return fnResult || MOCK_RESPONSES.quiz[0];
  } catch (err) {
    logger.error('Gemini quiz failed', { error: err.message });
    return MOCK_RESPONSES.quiz[0];
  }
}

/**
 * Classify a fraud report using AI.
 * @param {string} description - Citizen's report description
 * @returns {Promise<object>} Classification results
 */
async function classifyFraudReport(description) {
  initGemini();
  if (!model) return { ...MOCK_RESPONSES.fraud, _mock: true };

  try {
    const prompt = `Classify this report: "${description}". Use classify_fraud_report.`;
    const result = await model.generateContent(prompt);
    const fnResult = extractFunctionCall(result, 'classify_fraud_report');
    return fnResult || { ...MOCK_RESPONSES.fraud, _fallback: true };
  } catch (err) {
    logger.error('Gemini fraud classification failed', { error: err.message });
    return { ...MOCK_RESPONSES.fraud, _error: err.message };
  }
}

/**
 * Streams a chatbot response using Gemini.
 * @param {string} message - User input
 * @param {array} history - Conversation history
 * @param {string} [topic=''] - Contextual topic
 * @yields {object} Response chunks
 */
async function* streamChatResponse(message, history, topic = '') {
  initGemini();
  if (!model) {
    yield {
      type: 'text',
      chunk: "I'm currently in simulation mode. How can I help you with the election process?",
    };
    yield { type: 'suggestions', suggestions: ['Voting steps', 'Registration help'] };
    return;
  }

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(message);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: 'text', chunk: text };
    }
  } catch (err) {
    logger.error('Gemini stream failed', { error: err.message });
    yield { type: 'error', chunk: 'Service temporarily unavailable.' };
  }
}

module.exports = {
  analyzeElectionDocument,
  generateQuizQuestion,
  classifyFraudReport,
  streamChatResponse,
};
