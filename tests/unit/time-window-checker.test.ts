/**
 * Unit Tests for TimeWindowChecker
 */

import TimeWindowChecker from '../../src/outreach-engine/time-window-checker';

describe('TimeWindowChecker', () => {
  let timeChecker: TimeWindowChecker;

  beforeEach(() => {
    timeChecker = new TimeWindowChecker('Europe/Amsterdam', 9, 17); // 9 AM to 5 PM
  });

  describe('constructor', () => {
    it('should create checker with valid parameters', () => {
      const checker = new TimeWindowChecker('Europe/Amsterdam', 9, 17);
      expect(checker).toBeDefined();
    });

    it('should throw error for invalid start time', () => {
      expect(() => new TimeWindowChecker('Europe/Amsterdam', 25, 17))
        .toThrow('Start time must be between 0 and 23');
    });

    it('should throw error for invalid end time', () => {
      expect(() => new TimeWindowChecker('Europe/Amsterdam', 9, 24))
        .toThrow('End time must be between 0 and 23');
    });

    it('should throw error when start time is after end time', () => {
      expect(() => new TimeWindowChecker('Europe/Amsterdam', 17, 9))
        .toThrow('Start time must be before end time');
    });
  });

  describe('canSendNow', () => {
    it('should allow sending during business hours', () => {
      // Mock time to be 10 AM on a weekday
      const mockDate = new Date('2023-06-15T10:00:00+02:00'); // Thursday 10 AM CET
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());

      const result = timeChecker.canSendNow();
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Within business hours');

      Date.now = originalNow;
    });

    it('should deny sending outside business hours', () => {
      // Mock time to be 8 AM on a weekday
      const mockDate = new Date('2023-06-15T08:00:00+02:00'); // Thursday 8 AM CET
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());

      const result = timeChecker.canSendNow();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Outside business hours');

      Date.now = originalNow;
    });

    it('should deny sending on weekends', () => {
      // Mock time to be 10 AM on a Saturday
      const mockDate = new Date('2023-06-17T10:00:00+02:00'); // Saturday 10 AM CET
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());

      const result = timeChecker.canSendNow();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Weekend');

      Date.now = originalNow;
    });

    it('should handle timezone correctly', () => {
      // Test with different timezone
      const nyChecker = new TimeWindowChecker('America/New_York', 9, 17);
      
      // Mock time to be 10 AM EST (should be within business hours)
      const mockDate = new Date('2023-06-15T14:00:00Z'); // 10 AM EST
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());

      const result = nyChecker.canSendNow();
      expect(result.allowed).toBe(true);

      Date.now = originalNow;
    });

    it('should handle edge cases at start and end times', () => {
      // Test exactly at start time
      const mockDateStart = new Date('2023-06-15T09:00:00+02:00'); // 9 AM exactly
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDateStart.getTime());

      let result = timeChecker.canSendNow();
      expect(result.allowed).toBe(true);

      // Test exactly at end time
      const mockDateEnd = new Date('2023-06-15T17:00:00+02:00'); // 5 PM exactly
      Date.now = jest.fn(() => mockDateEnd.getTime());

      result = timeChecker.canSendNow();
      expect(result.allowed).toBe(false);

      Date.now = originalNow;
    });
  });

  describe('getNextAllowedTime', () => {
    it('should return next allowed time when outside window', () => {
      // Test outside business hours (8 AM)
      const mockDate = new Date('2023-06-15T08:00:00+02:00'); // Thursday 8 AM
      const nextTime = timeChecker.getNextAllowedTime(mockDate);
      expect(nextTime.getHours()).toBe(9); // Should be 9 AM same day
    });

    it('should skip to next day when after business hours', () => {
      // Test after business hours (6 PM)
      const mockDate = new Date('2023-06-15T18:00:00+02:00'); // Thursday 6 PM
      const nextTime = timeChecker.getNextAllowedTime(mockDate);
      expect(nextTime.getDate()).toBe(mockDate.getDate() + 1); // Next day
      expect(nextTime.getHours()).toBe(9); // 9 AM
    });

    it('should skip to Monday when on weekend', () => {
      // Test on Sunday
      const mockDate = new Date('2023-06-18T10:00:00+02:00'); // Sunday 10 AM
      const nextTime = timeChecker.getNextAllowedTime(mockDate);
      expect(nextTime.getDay()).toBe(1); // Monday
      expect(nextTime.getHours()).toBe(9); // 9 AM
    });
  });

  describe('formatNextAllowedTime', () => {
    it('should format time correctly', () => {
      const testTime = new Date('2023-06-15T12:00:00+02:00');
      const formatted = timeChecker.formatNextAllowedTime(testTime);
      expect(formatted).toContain('2023');
      expect(formatted).toContain('June');
    });
  });
});