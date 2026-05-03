const express = require('express');
const router = express.Router();
const db = require('../database');
const ai = require('../aiService');
const translate = require('../translationService');
const logger = require('../auditLogger');
const { sanitize } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/responseWrapper');

/**
 * Validates document analysis request parameters.
 * @param {string} imageBase64 
 * @param {string} mimeType 
 * @throws {Error} If validation fails
 */
function validateDocumentRequest(imageBase64, mimeType) {
  if (!imageBase64) {
    throw new Error('imageBase64 is required');
  }
  const approximateSize = (imageBase64.length * 3) / 4;
  if (approximateSize > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds 5MB limit');
  }
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validMimeTypes.includes(mimeType)) {
    throw new Error('Invalid mime type. Supported: jpeg, png, webp, gif');
  }
}

/**
 * @swagger
 * /api/translate:
 *   post:
 *     summary: Translates text into a target regional language
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text: { type: string }
 *               targetLang: { type: string }
 *     responses:
 *       200:
 *         description: Translated text
 */
router.post('/translate', async (req, res, next) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json(errorResponse('Text and targetLang are required'));
    }
    const translated = await translate.translateText(text, targetLang);
    res.json(successResponse({ translated }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/timeline:
 *   get:
 *     summary: Returns the 7-step election timeline
 *     responses:
 *       200:
 *         description: Timeline steps
 */
router.get('/timeline', async (req, res, next) => {
  try {
    const timeline = await db.getTimeline();
    logger.info('Timeline fetched', { steps: timeline.length });
    res.json(successResponse({ timeline }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/document/analyze:
 *   post:
 *     summary: Analyzes an election document via Gemini Vision
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageBase64: { type: string }
 *               mimeType: { type: string }
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/document/analyze', express.json({ limit: '8mb' }), async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;
    const mime = mimeType || 'image/jpeg';
    
    validateDocumentRequest(imageBase64, mime);
    
    const analysis = await ai.analyzeElectionDocument(imageBase64, mime);
    logger.info('Document analyzed', { documentType: analysis.document_type });
    res.json(successResponse({ analysis }));
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('limit') || err.message.includes('mime')) {
      return res.status(400).json(errorResponse(err.message));
    }
    next(err);
  }
});

/**
 * @swagger
 * /api/quiz/generate:
 *   post:
 *     summary: Generates an AI-powered quiz question
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic: { type: string }
 *     responses:
 *       200:
 *         description: Quiz question object
 */
router.post('/quiz/generate', async (req, res, next) => {
  try {
    const topic = sanitize(req.body.topic || 'general', 200);
    const question = await ai.generateQuizQuestion(topic);
    logger.info('Quiz question generated', { topic });
    res.json(successResponse({ question }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
