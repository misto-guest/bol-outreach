/**
 * Unit Tests for ProfileRotator
 */

import ProfileRotator from '../../src/outreach-engine/profile-rotator';

describe('ProfileRotator', () => {
  const mockProfiles = [
    { server: '77.42.21.134', port: 50325, profileId: 'profile-1' },
    { server: '77.42.21.134', port: 50326, profileId: 'profile-2' },
    { server: '77.42.21.134', port: 50327, profileId: 'profile-3' }
  ];

  describe('constructor', () => {
    it('should create rotator with valid profiles', () => {
      const rotator = new ProfileRotator(mockProfiles);
      expect(rotator).toBeDefined();
      expect(rotator.getProfileCount()).toBe(3);
      expect(rotator.isRotationEnabled()).toBe(true);
    });

    it('should disable rotation with single profile', () => {
      const singleProfile = [mockProfiles[0]];
      const rotator = new ProfileRotator(singleProfile);
      expect(rotator.getProfileCount()).toBe(1);
      expect(rotator.isRotationEnabled()).toBe(false);
    });

    it('should throw error with empty profiles', () => {
      expect(() => new ProfileRotator([])).toThrow('At least one profile is required');
    });
  });

  describe('getNextProfile', () => {
    it('should rotate through profiles in order', () => {
      const rotator = new ProfileRotator(mockProfiles);
      
      const profile1 = rotator.getNextProfile();
      const profile2 = rotator.getNextProfile();
      const profile3 = rotator.getNextProfile();
      const profile4 = rotator.getNextProfile(); // Should wrap around

      expect(profile1.profileId).toBe('profile-1');
      expect(profile2.profileId).toBe('profile-2');
      expect(profile3.profileId).toBe('profile-3');
      expect(profile4.profileId).toBe('profile-1');
    });

    it('should return same profile when only one profile', () => {
      const singleProfile = [mockProfiles[0]];
      const rotator = new ProfileRotator(singleProfile);
      
      const profile1 = rotator.getNextProfile();
      const profile2 = rotator.getNextProfile();

      expect(profile1.profileId).toBe('profile-1');
      expect(profile2.profileId).toBe('profile-1');
      expect(profile1).toEqual(profile2);
    });
  });

  describe('getProfileCount', () => {
    it('should return correct profile count', () => {
      const rotator = new ProfileRotator(mockProfiles);
      expect(rotator.getProfileCount()).toBe(3);
    });
  });

  describe('isRotationEnabled', () => {
    it('should enable rotation with multiple profiles', () => {
      const rotator = new ProfileRotator(mockProfiles);
      expect(rotator.isRotationEnabled()).toBe(true);
    });

    it('should disable rotation with single profile', () => {
      const singleProfile = [mockProfiles[0]];
      const rotator = new ProfileRotator(singleProfile);
      expect(rotator.isRotationEnabled()).toBe(false);
    });
  });
});