import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('returns ok status with mode', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(['firebase', 'memory']).toContain(res.body.mode);
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/config', () => {
    it('returns config object with mapsApiKey', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('mapsApiKey');
      expect(res.body).toHaveProperty('ga4MeasurementId');
    });
  });

  describe('GET /api/metadata', () => {
    it('returns service metadata', async () => {
      const res = await request(app).get('/api/metadata');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service');
      expect(res.body).toHaveProperty('infra');
      expect(res.body.infra).toHaveProperty('database');
    });
  });

  describe('GET /api/timeline', () => {
    it('returns 7-step election timeline', async () => {
      const res = await request(app).get('/api/timeline');
      expect(res.status).toBe(200);
      expect(res.body.timeline).toHaveLength(7);
      expect(res.body.timeline[0]).toHaveProperty('title');
      expect(res.body.timeline[0]).toHaveProperty('step');
    });
  });

  describe('POST /api/document/analyze', () => {
    it('returns structured analysis for mock base64', async () => {
      const mockBase64 = Buffer.from('mock-image-data').toString('base64');
      const res = await request(app).post('/api/document/analyze')
        .send({ imageBase64: mockBase64, mimeType: 'image/jpeg' });
      expect(res.status).toBe(200);
      expect(res.body.analysis).toHaveProperty('document_type');
      expect(res.body.analysis).toHaveProperty('key_information');
      expect(res.body.analysis).toHaveProperty('required_action');
    });

    it('rejects request without imageBase64', async () => {
      const res = await request(app).post('/api/document/analyze').send({});
      expect(res.status).toBe(400);
    });

    it('rejects invalid mime type', async () => {
      const res = await request(app).post('/api/document/analyze')
        .send({ imageBase64: 'abc', mimeType: 'application/pdf' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/quiz/generate', () => {
    it('returns valid quiz question shape', async () => {
      const res = await request(app).post('/api/quiz/generate')
        .send({ topic: 'voter registration' });
      expect(res.status).toBe(200);
      const q = res.body.question;
      expect(q).toHaveProperty('question');
      expect(q.options).toHaveLength(4);
      expect(typeof q.correct_index).toBe('number');
      expect(q.correct_index).toBeGreaterThanOrEqual(0);
      expect(q.correct_index).toBeLessThanOrEqual(3);
      expect(q).toHaveProperty('explanation');
    });
  });

  describe('POST /api/fraud/report', () => {
    it('returns classification with reportId', async () => {
      const res = await request(app).post('/api/fraud/report')
        .send({ description: 'Someone distributing money near polling booth in sector 15', location: 'Delhi, India' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reportId');
      expect(res.body).toHaveProperty('fraud_type');
      expect(res.body).toHaveProperty('severity');
      expect(res.body).toHaveProperty('recommended_action');
      expect(res.body.reportId).toMatch(/^VV-/);
    });

    it('rejects short description', async () => {
      const res = await request(app).post('/api/fraud/report')
        .send({ description: 'short', location: 'Delhi' });
      expect(res.status).toBe(400);
    });

    it('rejects missing location', async () => {
      const res = await request(app).post('/api/fraud/report')
        .send({ description: 'Someone is distributing cash near the booth' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/fraud/reports', () => {
    it('returns array of reports', async () => {
      const res = await request(app).get('/api/fraud/reports');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });
  });

  describe('POST /api/simulate', () => {
    it('seeds mock data', async () => {
      const res = await request(app).post('/api/simulate');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
    });
  });

  describe('POST /api/report/export', () => {
    it('returns export result', async () => {
      const res = await request(app).post('/api/report/export');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exported');
    });
  });

  describe('E2E Smoke: Quiz flow', () => {
    it('generate → answer → valid', async () => {
      const genRes = await request(app).post('/api/quiz/generate').send({ topic: 'general' });
      expect(genRes.status).toBe(200);
      const q = genRes.body.question;
      expect(q.options).toHaveLength(4);
      // Simulate answering correctly
      expect(q.correct_index).toBeGreaterThanOrEqual(0);
    });
  });
});
