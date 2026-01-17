import { isValidFramework, SUPPORTED_FRAMEWORKS } from '../src/config/settings';

describe('settings', () => {
  describe('SUPPORTED_FRAMEWORKS', () => {
    it('should include jest, vitest, and mocha', () => {
      expect(SUPPORTED_FRAMEWORKS).toContain('jest');
      expect(SUPPORTED_FRAMEWORKS).toContain('vitest');
      expect(SUPPORTED_FRAMEWORKS).toContain('mocha');
    });

    it('should have exactly 3 frameworks', () => {
      expect(SUPPORTED_FRAMEWORKS).toHaveLength(3);
    });
  });

  describe('isValidFramework', () => {
    it('should return true for valid frameworks', () => {
      expect(isValidFramework('jest')).toBe(true);
      expect(isValidFramework('vitest')).toBe(true);
      expect(isValidFramework('mocha')).toBe(true);
    });

    it('should return false for invalid frameworks', () => {
      expect(isValidFramework('invalid')).toBe(false);
      expect(isValidFramework('jasmine')).toBe(false);
      expect(isValidFramework('')).toBe(false);
      expect(isValidFramework('JEST')).toBe(false); // case sensitive
    });
  });
});
