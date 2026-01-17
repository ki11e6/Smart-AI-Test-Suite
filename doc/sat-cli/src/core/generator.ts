import * as fs from 'fs-extra';
import * as path from 'path';
import { CodeAnalysis } from './analyzer';

export type TestFramework = 'jest' | 'vitest' | 'mocha';

/**
 * Get framework-specific imports for test files
 */
export function getFrameworkImports(framework: TestFramework): string {
  switch (framework) {
    case 'vitest':
      return "import { describe, it, expect, beforeEach, afterEach } from 'vitest';";
    case 'mocha':
      return "import { expect } from 'chai';";
    case 'jest':
    default:
      // Jest globals are auto-available, no import needed
      return '';
  }
}

/**
 * Get framework-specific import example for AI prompts
 */
export function getFrameworkImportExample(framework: TestFramework, importPath: string, exports: string[]): string {
  const exportsStr = exports.length > 0 ? exports.join(', ') : 'myFunction';

  switch (framework) {
    case 'vitest':
      return `import { describe, it, expect } from 'vitest';
import { ${exportsStr} } from '${importPath}';`;
    case 'mocha':
      return `import { expect } from 'chai';
import { ${exportsStr} } from '${importPath}';`;
    case 'jest':
    default:
      return `// Jest globals (describe, it, expect) are auto-available
import { ${exportsStr} } from '${importPath}';`;
  }
}

/**
 * Calculate the relative import path from test file to source file
 */
export function calculateImportPath(sourceFilePath: string, testFilePath: string): string {
  const testFileDir = path.dirname(testFilePath);
  const relativePath = path.relative(testFileDir, sourceFilePath)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '')
    .replace(/\.jsx?$/, '');

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

export async function generateTest(
  sourceFilePath: string,
  analysis: CodeAnalysis,
  outputDir: string,
  framework: TestFramework = 'jest'
): Promise<string> {
  const sourceFileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  const testFileName = `${sourceFileName}.test.ts`;
  const testDir = path.join(path.dirname(sourceFilePath), outputDir);
  const testFilePath = path.join(testDir, testFileName);

  // Ensure test directory exists
  await fs.ensureDir(testDir);

  // Generate test content
  const testContent = generateTestContent(sourceFilePath, testFilePath, analysis, framework);

  // Write test file
  await fs.writeFile(testFilePath, testContent, 'utf-8');

  return testFilePath;
}

function generateTestContent(
  sourceFilePath: string,
  testFilePath: string,
  analysis: CodeAnalysis,
  framework: TestFramework
): string {
  const importPath = calculateImportPath(sourceFilePath, testFilePath);
  const frameworkImports = getFrameworkImports(framework);
  
  let imports = '';
  let testCases = '';

  // Generate imports and tests for exported functions
  const exportedFunctions = analysis.functions.filter(f => f.isExported);
  
  if (exportedFunctions.length > 0) {
    const functionNames = exportedFunctions.map(f => f.name).join(', ');
    imports = `import { ${functionNames} } from '${importPath}';`;
    
    exportedFunctions.forEach(func => {
      testCases += generateFunctionTests(func);
    });
  }

  // Generate tests for classes
  analysis.classes.forEach(cls => {
    if (!imports) {
      imports = `import { ${cls.name} } from '${importPath}';`;
    } else {
      imports = imports.replace('}', `, ${cls.name} }`);
    }
    
    testCases += generateClassTests(cls);
  });

  // Default if no exports found
  if (!imports) {
    imports = `import * as module from '${importPath}';`;
    testCases = `describe('${path.basename(sourceFilePath)}', () => {
  it('should be defined', () => {
    expect(module).toBeDefined();
  });
});`;
  }

  // Build the final test file content
  const parts: string[] = [];

  // Add framework-specific imports if needed
  if (frameworkImports) {
    parts.push(frameworkImports);
  }

  // Add source imports
  parts.push(imports);

  // Add test cases
  parts.push(testCases);

  return parts.join('\n\n') + '\n';
}

function generateFunctionTests(func: { name: string; parameters: string[] }): string {
  return `
describe('${func.name}', () => {
  it('should be defined', () => {
    expect(${func.name}).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof ${func.name}).toBe('function');
  });

  // TODO: Add specific test cases for ${func.name}
  // Example:
  // it('should return expected value', () => {
  //   const result = ${func.name}(${func.parameters.map((_, i) => `arg${i}`).join(', ')});
  //   expect(result).toBeDefined();
  // });
});
`;
}

function generateClassTests(cls: { name: string; methods: Array<{ name: string; parameters: string[] }> }): string {
  let tests = `
describe('${cls.name}', () => {
  it('should be defined', () => {
    expect(${cls.name}).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof ${cls.name}).toBe('function');
  });

  describe('instance', () => {
    let instance: ${cls.name};

    beforeEach(() => {
      instance = new ${cls.name}();
    });

`;

  cls.methods.forEach(method => {
    tests += `    describe('${method.name}', () => {
      it('should be defined', () => {
        expect(instance.${method.name}).toBeDefined();
      });

      it('should be a function', () => {
        expect(typeof instance.${method.name}).toBe('function');
      });

      // TODO: Add specific test cases for ${method.name}
    });

`;
  });

  tests += `  });
});
`;

  return tests;
}

