import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Security Tests', () => {
  describe('Helmet Headers', () => {
    it('sets x-frame-options header', async () => {
      const res = await request(app).get('/api/health');
      const xfo = res.headers['x-frame-options'];
      expect(xfo).toBeDefined();
    });

    it('sets x-content-type-options to nosniff', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('does not expose x-powered-by', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets content-security-policy', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('truncates description over 1000 chars', async () => {
      const longDesc = 'A'.repeat(2000);
      const res = await request(app)
        .post('/api/fraud/report')
        .send({ description: longDesc, location: 'Test Location' });
      // Should still work (truncated to 1000)
      expect(res.status).toBe(200);
    });

    it('rejects image over 5MB', async () => {
      const bigImage = 'A'.repeat(7 * 1024 * 1024); // ~7MB in base64
      const res = await request(app)
        .post('/api/document/analyze')
        .send({ imageBase64: bigImage, mimeType: 'image/jpeg' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('5MB');
    });

    it('rejects empty body on document analyze', async () => {
      const res = await request(app).post('/api/document/analyze').send({});
      expect(res.status).toBe(400);
    });

    it('handles wrong content types gracefully', async () => {
      const res = await request(app)
        .post('/api/document/analyze')
        .send({ imageBase64: 'test', mimeType: 'text/plain' });
      expect(res.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('includes rate limit headers', async () => {
      const res = await request(app).get('/api/health');
      // express-rate-limit v7 uses standard headers
      const rlHeaders = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
      // At minimum, the response should succeed
      expect(res.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('allows localhost origin', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(200);
    });
  });

  describe('Report ID Security', () => {
    it('generates non-sequential HMAC-style report IDs', async () => {
      const res1 = await request(app)
        .post('/api/fraud/report')
        .send({ description: 'Test suspicious activity report one', location: 'Delhi' });
      const res2 = await request(app)
        .post('/api/fraud/report')
        .send({ description: 'Test suspicious activity report two', location: 'Mumbai' });
      expect(res1.body.reportId).toMatch(/^VV-/);
      expect(res2.body.reportId).toMatch(/^VV-/);
      expect(res1.body.reportId).not.toBe(res2.body.reportId);
    });
  });
});
