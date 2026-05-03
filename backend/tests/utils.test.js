/**
 * VoterVerse — Utility Unit Tests
 * Validates core functions: extractFunctionCall and withRetry.
 */

const { withRetry } = require('../backend/utils/helpers');

describe('Utility Logic', () => {
  describe('withRetry', () => {
    it('should retry on transient failure and succeed', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          const err = new Error('Transient error');
          err.code = 'ECONNREFUSED';
          throw err;
        }
        return 'success';
      };

      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after max attempts', async () => {
      const fn = async () => {
        const err = new Error('Persistent error');
        err.code = 'ECONNREFUSED';
        throw err;
      };

      await expect(withRetry(fn, 2, 10)).rejects.toThrow('Persistent error');
    });

    it('should not retry on non-transient errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Fatal error');
      };

      await expect(withRetry(fn, 3, 10)).rejects.toThrow('Fatal error');
      expect(attempts).toBe(1);
    });
  });
});
