import { calculateImportPath, getFrameworkImports, getFrameworkImportExample } from '../src/core/generator';

describe('generator', () => {
  describe('calculateImportPath', () => {
    it('should calculate relative path from test to source in __tests__ folder', () => {
      const sourcePath = '/project/src/utils/helper.ts';
      const testPath = '/project/src/utils/__tests__/helper.test.ts';

      const result = calculateImportPath(sourcePath, testPath);
      expect(result).toBe('../helper');
    });

    it('should calculate relative path for sibling files', () => {
      const sourcePath = '/project/src/index.ts';
      const testPath = '/project/src/index.test.ts';

      const result = calculateImportPath(sourcePath, testPath);
      expect(result).toBe('./index');
    });

    it('should handle deeply nested paths', () => {
      const sourcePath = '/project/src/components/Button/Button.tsx';
      const testPath = '/project/src/components/Button/__tests__/Button.test.ts';

      const result = calculateImportPath(sourcePath, testPath);
      expect(result).toBe('../Button');
    });

    it('should strip file extensions', () => {
      const sourcePath = '/project/src/utils.ts';
      const testPath = '/project/__tests__/utils.test.ts';

      const result = calculateImportPath(sourcePath, testPath);
      expect(result).not.toContain('.ts');
    });
  });

  describe('getFrameworkImports', () => {
    it('should return empty string for jest (globals)', () => {
      expect(getFrameworkImports('jest')).toBe('');
    });

    it('should return vitest imports for vitest', () => {
      const result = getFrameworkImports('vitest');
      expect(result).toContain("import { describe, it, expect");
      expect(result).toContain("from 'vitest'");
    });

    it('should return chai import for mocha', () => {
      const result = getFrameworkImports('mocha');
      expect(result).toContain("import { expect } from 'chai'");
    });
  });

  describe('getFrameworkImportExample', () => {
    it('should include the import path in examples', () => {
      const result = getFrameworkImportExample('jest', '../utils', ['myFunc']);
      expect(result).toContain("from '../utils'");
      expect(result).toContain('myFunc');
    });

    it('should not import describe/it/expect for jest', () => {
      const result = getFrameworkImportExample('jest', '../utils', ['myFunc']);
      expect(result).toContain('globals');
      expect(result).not.toMatch(/import.*describe.*from/);
    });

    it('should import from vitest for vitest framework', () => {
      const result = getFrameworkImportExample('vitest', '../utils', ['myFunc']);
      expect(result).toContain("from 'vitest'");
    });
  });
});
