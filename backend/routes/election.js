const express = require('express');
const router = express.Router();
const db = require('../database');
const ai = require('../aiService');
const translate = require('../translationService');
const logger = require('../auditLogger');
const { sanitize } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/responseWrapper');

/**
 * @swagger
 * /api/translate:
 *   post:
 *     summary: Translates text into a target regional language
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
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/document/analyze', express.json({ limit: '8mb' }), async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json(errorResponse('imageBase64 is required'));
    }
    // Validate image size (approximate: base64 is ~4/3 of original)
    const approximateSize = (imageBase64.length * 3) / 4;
    if (approximateSize > 5 * 1024 * 1024) {
      return res.status(400).json(errorResponse('Image size exceeds 5MB limit'));
    }
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mime = mimeType || 'image/jpeg';
    if (!validMimeTypes.includes(mime)) {
      return res
        .status(400)
        .json(errorResponse('Invalid mime type. Supported: jpeg, png, webp, gif'));
    }
    const analysis = await ai.analyzeElectionDocument(imageBase64, mime);
    logger.info('Document analyzed', { documentType: analysis.document_type });
    res.json(successResponse({ analysis }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/quiz/generate:
 *   post:
 *     summary: Generates an AI-powered quiz question
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
