/**
 * Unit Tests for RateLimiter
 */

import RateLimiter from '../../src/outreach-engine/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(5); // 5 messages per hour
  });

  describe('constructor', () => {
    it('should create limiter with specified limit', () => {
      const limiter = new RateLimiter(10);
      expect(limiter).toBeDefined();
    });
  });

  describe('canSend', () => {
    it('should allow sending when under limit', () => {
      const result = rateLimiter.canSend('test-profile');
      expect(result.allowed).toBe(true);
    });

    it('should deny sending when at limit', () => {
      // Record 5 messages
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordMessage('test-profile');
      }

      const result = rateLimiter.canSend('test-profile');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hourly limit reached');
    });

    it('should allow sending for different profiles independently', () => {
      // Send 5 messages for profile1
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordMessage('profile1');
      }

      // Should still allow sending for profile2
      const result = rateLimiter.canSend('profile2');
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordMessage', () => {
    it('should increment message count', () => {
      rateLimiter.recordMessage('test-profile');
      const stats = rateLimiter.getStats('test-profile');
      expect(stats?.sent).toBe(1);
      expect(stats?.limit).toBe(5);
    });

    it('should create new profile stats when recording first message', () => {
      rateLimiter.recordMessage('new-profile');
      const stats = rateLimiter.getStats('new-profile');
      expect(stats?.sent).toBe(1);
      expect(stats?.limit).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return current stats for profile', () => {
      rateLimiter.recordMessage('test-profile');
      rateLimiter.recordMessage('test-profile');

      const stats = rateLimiter.getStats('test-profile');
      expect(stats?.sent).toBe(2);
      expect(stats?.limit).toBe(5);
      expect(stats?.resetIn).toBeDefined();
    });

    it('should return null for non-existent profile', () => {
      const stats = rateLimiter.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should return stats with reset time', () => {
      rateLimiter.recordMessage('test-profile');
      rateLimiter.recordMessage('test-profile');
      rateLimiter.recordMessage('test-profile');

      const stats = rateLimiter.getStats('test-profile');
      expect(stats?.resetIn).toBeDefined();
      expect(typeof stats?.resetIn).toBe('number');
    });
  });

  describe('time-based limiting', () => {
    it('should reset counts after hour', () => {
      // Record messages
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordMessage('test-profile');
      }

      // Mock time to simulate hour passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 61 * 60 * 1000); // 61 minutes later

      const result = rateLimiter.canSend('test-profile');
      expect(result.allowed).toBe(true);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});