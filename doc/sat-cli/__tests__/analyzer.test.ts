import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { analyzeCode } from '../src/core/analyzer';

describe('analyzer', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sat-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('analyzeCode', () => {
    it('should detect exported functions', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, `
        export function myFunction(a: string, b: number): boolean {
          return true;
        }
      `);

      const result = await analyzeCode(filePath);

      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0].name).toBe('myFunction');
      expect(result!.functions[0].isExported).toBe(true);
      expect(result!.functions[0].parameters).toEqual(['a', 'b']);
    });

    it('should detect non-exported functions', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, `
        function privateFunction() {
          return 'private';
        }
      `);

      const result = await analyzeCode(filePath);

      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0].name).toBe('privateFunction');
      expect(result!.functions[0].isExported).toBe(false);
    });

    it('should detect exported arrow functions', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, `
        export const myArrowFunc = (x: number) => x * 2;
      `);

      const result = await analyzeCode(filePath);

      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0].name).toBe('myArrowFunc');
      expect(result!.functions[0].isExported).toBe(true);
    });

    it('should detect classes and their methods', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, `
        export class MyClass {
          constructor() {}

          myMethod(param: string): void {
            console.log(param);
          }

          anotherMethod(): number {
            return 42;
          }
        }
      `);

      const result = await analyzeCode(filePath);

      expect(result).not.toBeNull();
      expect(result!.classes).toHaveLength(1);
      expect(result!.classes[0].name).toBe('MyClass');
      expect(result!.classes[0].methods.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null for non-typescript files', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'just some text');

      const result = await analyzeCode(filePath);

      expect(result).toBeNull();
    });

    it('should handle multiple exports', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, `
        export function funcA() { return 'a'; }
        export function funcB() { return 'b'; }
        export const funcC = () => 'c';
      `);

      const result = await analyzeCode(filePath);

      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(3);

      const exportedFuncs = result!.functions.filter(f => f.isExported);
      expect(exportedFuncs).toHaveLength(3);
    });
  });
});
