/**
 * VoterVerse — Full End-to-End Integration Tests
 * Validates the complete user journey through the platform.
 * Ensures that different Google Services (Gemini, Firebase, GCS) work together.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server'; // Actual server instance

describe('VoterVerse Integration Flows', () => {
  let sessionId = 'test-session-' + Date.now();

  it('Flow 1: Health & Config Readiness', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    const configRes = await request(app).get('/api/config');
    expect(configRes.status).toBe(200);
    expect(configRes.body).toHaveProperty('mapsApiKey');
  });

  it('Flow 2: AI Education & Quiz Path', async () => {
    // 1. Fetch Timeline
    const timelineRes = await request(app).get('/api/timeline');
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.timeline.length).toBeGreaterThan(0);

    // 2. Generate Quiz for a topic
    const quizRes = await request(app)
      .post('/api/quiz/generate')
      .send({ topic: 'voter registration' });
    expect(quizRes.status).toBe(200);
    expect(quizRes.body.question).toBeDefined();
    expect(quizRes.body.question.options).toHaveLength(4);
  });

  it('Flow 3: Chatbot Interaction with Memory', async () => {
    // 1. Send first message
    const chatRes = await request(app)
      .post('/api/chat/stream')
      .send({ sessionId, message: 'How do I register to vote?' });

    // Note: stream response is a bit tricky with supertest,
    // but we check the first chunk or final status
    expect(chatRes.status).toBe(200);

    // 2. Verify history exists in database
    const historyRes = await request(app).get(`/api/chat/history/${sessionId}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history.length).toBeGreaterThan(0);
    expect(historyRes.body.history[0].role).toBe('user');
  });

  it('Flow 4: Fraud Reporting Pipeline (AI -> GCS -> DB)', async () => {
    const reportData = {
      description: 'I saw someone offering money near the booth in Mumbai.',
      location: 'Mumbai Central',
      fraudType: 'vote_buying',
    };

    const res = await request(app).post('/api/fraud/report').send(reportData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportId).toMatch(/^VV-/);
    expect(res.body.classification.severity).toBeDefined();

    // Verify it appears in the public dashboard
    const listRes = await request(app).get('/api/fraud/reports');
    const report = listRes.body.reports.find((r) => r.reportId === res.body.reportId);
    expect(report).toBeDefined();
    expect(report.location).toBe(reportData.location);
  });

  it('Flow 5: Multilingual Support', async () => {
    const translateRes = await request(app)
      .post('/api/translate')
      .send({ text: 'How to vote', targetLang: 'hi' });

    expect(translateRes.status).toBe(200);
    expect(translateRes.body.translated).toBeDefined();
  });
});
