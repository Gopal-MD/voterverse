const express = require('express');
const router = express.Router();
const db = require('../database');
const ai = require('../aiService');
const logger = require('../auditLogger');
const { sanitize } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { chatLimiter } = require('../middleware/rateLimiters');

/**
 * @swagger
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Gets chat history for a session
 *     responses:
 *       200:
 *         description: Array of chat messages
 */
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const sessionId = sanitize(req.params.sessionId, 100);
    const history = await db.getConversation(sessionId);
    res.json(successResponse({ history }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/chat/{sessionId}:
 *   delete:
 *     summary: Clears chat history for a session
 *     responses:
 *       200:
 *         description: Clear status
 */
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const sessionId = sanitize(req.params.sessionId, 100);
    await db.clearConversation(sessionId);
    res.json(successResponse({ status: 'cleared' }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/chat/stream:
 *   post:
 *     summary: Streams an AI chatbot response (SSE)
 *     responses:
 *       200:
 *         description: SSE Stream
 */
router.post('/stream', chatLimiter, async (req, res) => {
  try {
    const sessionId = sanitize(req.body.sessionId, 100);
    const message = sanitize(req.body.message, 1000);
    const topic = sanitize(req.body.topic || '', 100);

    if (!sessionId || !message) {
      return res.status(400).json(errorResponse('sessionId and message are required'));
    }

    const history = await db.appendMessage(sessionId, { role: 'user', content: message });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullModelResponse = '';
    const stream = ai.streamChatResponse(message, history.slice(0, -1), topic);
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullModelResponse += chunk.chunk;
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.chunk })}\n\n`);
      } else if (chunk.type === 'suggestions') {
        res.write(
          `data: ${JSON.stringify({ type: 'suggestions', content: chunk.suggestions })}\n\n`
        );
      }
    }

    await db.appendMessage(sessionId, { role: 'model', content: fullModelResponse });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    logger.error('Chat stream failed', { error: err.message });
    res.write(
      `data: ${JSON.stringify({ type: 'error', content: 'Failed to generate response' })}\n\n`
    );
    res.end();
  }
});

module.exports = router;
