/**
 * VoterVerse — AI Service (Gemini 2.0 Flash)
 * Handles document analysis, quiz generation, and chat streaming.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./auditLogger');
const constants = require('./config/constants');
const { withRetry } = require('./utils/helpers');
const functionDeclarations = require('./config/aiTools.js');
const MOCK_RESPONSES = require('./config/aiMocks.js');

/**
 * Safely extracts function call arguments from a Gemini response.
 * @param {object} response - Gemini API response
 * @param {string} expectedName - Expected function name
 * @returns {object|null} Arguments or null
 * @throws {Error} None
 */
function extractFunctionCall(response, expectedName) {
  if (!response?.response?.candidates?.[0]?.content?.parts) {
    logger.debug('Invalid Gemini response structure', { expectedName });
    return null;
  }

  const parts = response.response.candidates[0].content.parts;
  const functionCall = parts.find((part) => part.functionCall?.name === expectedName);

  return functionCall?.args ?? null;
}

/**
 * AI Service Manager with encapsulated state.
 */
class AIServiceManager {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.quizIndex = 0;
    this.initialized = false;
  }

  /**
   * Initialize Gemini client once.
   */
  initGemini() {
    if (this.initialized) return;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      logger.warn('GEMINI_API_KEY missing; using MOCK AI service');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(key);
      this.model = this.genAI.getGenerativeModel({
        model: constants.AI.GEMINI_MODEL,
        tools: [{ functionDeclarations }],
        generationConfig: {
          temperature: constants.AI.TEMPERATURE,
          topP: constants.AI.TOP_P,
          maxOutputTokens: constants.AI.MAX_OUTPUT_TOKENS,
        },
      });
      this.initialized = true;
      logger.info('Gemini AI initialized successfully');
    } catch (err) {
      logger.error('Gemini initialization failed', { error: err.message });
      this.initialized = false;
    }
  }

  /**
   * Executes an AI operation with fallback handling.
   * @param {Function} operation - Async function to execute
   * @param {string} operationName - Name for logging
   * @param {object} fallbackMock - Mock response on failure
   * @param {object} [context={}] - Contextual metadata for logging
   * @returns {Promise<object>} Result or fallback
   */
  async executeAIOperation(operation, operationName, fallbackMock, context = {}) {
    this.initGemini();
    const startTime = Date.now();
    if (!this.model) {
      logger.info(`${operationName} using mock fallback`, { ...context, duration: Date.now() - startTime });
      return { ...fallbackMock, _mock: true };
    }

    try {
      const result = await operation();
      logger.info(`${operationName} succeeded`, { ...context, duration: Date.now() - startTime });
      return result;
    } catch (err) {
      logger.error(`${operationName} failed`, {
        ...context,
        error: err.message,
        code: err.code,
        status: err.status,
        duration: Date.now() - startTime,
      });
      return { ...fallbackMock, _error: err.message };
    }
  }

  async analyzeElectionDocument(base64Image, mimeType = 'image/jpeg') {
    const context = {
      mimeType,
      imageSizeKB: Math.round((base64Image.length * 3) / 4 / 1024),
    };

    return this.executeAIOperation(
      async () => {
        const prompt = `Analyze this election document. Use explain_election_document.`;
        const result = await withRetry(() =>
          this.model.generateContent([prompt, { inlineData: { mimeType, data: base64Image } }])
        );
        const fnResult = extractFunctionCall(result, 'explain_election_document');
        return fnResult || { ...MOCK_RESPONSES.document, _fallback: true };
      },
      'Gemini Vision',
      MOCK_RESPONSES.document,
      context
    );
  }

  async generateQuizQuestion(topic = 'general') {
    return this.executeAIOperation(
      async () => {
        const prompt = `Generate a quiz question about: "${topic}". Use generate_quiz_question.`;
        const result = await withRetry(() => this.model.generateContent(prompt));
        const fnResult = extractFunctionCall(result, 'generate_quiz_question');
        return fnResult || MOCK_RESPONSES.quiz[0];
      },
      'Gemini Quiz',
      MOCK_RESPONSES.quiz[0]
    );
  }

  async classifyFraudReport(description) {
    return this.executeAIOperation(
      async () => {
        const prompt = `Classify this report: "${description}". Use classify_fraud_report.`;
        const result = await withRetry(() => this.model.generateContent(prompt));
        const fnResult = extractFunctionCall(result, 'classify_fraud_report');
        return fnResult || { ...MOCK_RESPONSES.fraud, _fallback: true };
      },
      'Gemini Fraud Classification',
      MOCK_RESPONSES.fraud
    );
  }

  async* streamChatResponse(message, history, topic = '') {
    this.initGemini();
    if (!this.model) {
      yield {
        type: 'text',
        chunk: "I'm currently in simulation mode. How can I help you with the election process?",
      };
      yield { type: 'suggestions', suggestions: ['Voting steps', 'Registration help'] };
      return;
    }

    try {
      const chat = this.model.startChat({ history });
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
}

const instance = new AIServiceManager();
instance.MOCK_RESPONSES = MOCK_RESPONSES;
module.exports = instance;
