/**
 * Smart AI Test Suit - Test Generation Service
 * Provides framework detection, mock generation, and edge case analysis.
 */

import { existsSync } from 'node:fs';
import { readFile as fsReadFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  TestFramework,
  DependencyInfo,
  FunctionSignature,
  ParameterInfo,
} from '../types.js';

// =============================================================================
// Framework Detection (Story 5.4)
// =============================================================================

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Detect the test framework from package.json
 * Priority: vitest > jest > mocha > default (vitest)
 */
export async function detectFramework(
  projectDir?: string,
  override?: TestFramework
): Promise<TestFramework> {
  // CLI override takes precedence
  if (override) {
    return override;
  }

  const packageJson = await findPackageJson(projectDir);
  if (!packageJson) {
    return 'vitest'; // Default
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check for vitest first (preferred)
  if ('vitest' in allDeps) {
    return 'vitest';
  }

  // Check for jest
  if ('jest' in allDeps || '@jest/globals' in allDeps) {
    return 'jest';
  }

  // Check for mocha
  if ('mocha' in allDeps) {
    return 'mocha';
  }

  // Check scripts for clues
  const scripts = packageJson.scripts || {};
  const testScript = scripts.test || '';

  if (testScript.includes('vitest')) {
    return 'vitest';
  }
  if (testScript.includes('jest')) {
    return 'jest';
  }
  if (testScript.includes('mocha')) {
    return 'mocha';
  }

  // Default to vitest
  return 'vitest';
}

/**
 * Find and parse package.json from a directory or its parents
 */
export async function findPackageJson(startDir?: string): Promise<PackageJson | null> {
  let currentDir = startDir || process.cwd();
  const root = dirname(currentDir);

  while (currentDir !== root) {
    const packagePath = join(currentDir, 'package.json');
    if (existsSync(packagePath)) {
      try {
        const content = await fsReadFile(packagePath, 'utf-8');
        return JSON.parse(content) as PackageJson;
      } catch {
        return null;
      }
    }
    currentDir = dirname(currentDir);
  }

  // Check root as well
  const rootPackage = join(root, 'package.json');
  if (existsSync(rootPackage)) {
    try {
      const content = await fsReadFile(rootPackage, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  return null;
}

// =============================================================================
// Mock Generation Helpers (Story 5.5)
// =============================================================================

export interface MockInstruction {
  importPath: string;
  mockCode: string;
  setupCode: string;
  isExternal: boolean;
}

/**
 * Generate mock instructions for dependencies
 */
export function generateMockInstructions(
  dependencies: DependencyInfo[],
  framework: TestFramework
): MockInstruction[] {
  const instructions: MockInstruction[] = [];

  for (const dep of dependencies) {
    // Skip testing utilities that shouldn't be mocked
    if (isTestingUtility(dep.path)) {
      continue;
    }

    const mockCode = generateMockCall(dep.path, framework);
    const setupCode = generateMockSetup(dep, framework);

    instructions.push({
      importPath: dep.path,
      mockCode,
      setupCode,
      isExternal: dep.isExternal,
    });
  }

  return instructions;
}

/**
 * Check if a dependency is a testing utility that shouldn't be mocked
 */
function isTestingUtility(path: string): boolean {
  const testingPackages = [
    'vitest',
    'jest',
    '@jest/globals',
    'mocha',
    'chai',
    'sinon',
    'expect',
    '@testing-library',
  ];
  return testingPackages.some((pkg) => path === pkg || path.startsWith(`${pkg}/`));
}

/**
 * Generate the mock() call for a dependency
 */
function generateMockCall(importPath: string, framework: TestFramework): string {
  const mockFn = framework === 'vitest' ? 'vi.mock' : 'jest.mock';
  return `${mockFn}('${importPath}');`;
}

/**
 * Generate mock setup code for a dependency
 */
function generateMockSetup(dep: DependencyInfo, framework: TestFramework): string {
  if (dep.functionSignatures.length === 0) {
    return '';
  }

  const lines: string[] = [];
  const mockFn = framework === 'vitest' ? 'vi.fn' : 'jest.fn';
  const mockedFn = framework === 'vitest' ? 'vi.mocked' : 'jest.mocked';

  for (const sig of dep.functionSignatures) {
    if (!sig.isExported) continue;

    const mockValue = generateMockReturnValue(sig);
    const asyncMethod = sig.isAsync ? 'mockResolvedValue' : 'mockReturnValue';

    if (dep.isExternal) {
      // For external deps, we typically mock the whole module
      lines.push(`// Mock ${sig.name} from ${dep.path}`);
      lines.push(`const mock${capitalize(sig.name)} = ${mockFn}().${asyncMethod}(${mockValue});`);
    } else {
      // For local deps, use vi.mocked for type safety
      lines.push(`const mock${capitalize(sig.name)} = ${mockedFn}(${sig.name});`);
      lines.push(`mock${capitalize(sig.name)}.${asyncMethod}(${mockValue});`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a mock return value based on function signature
 */
function generateMockReturnValue(sig: FunctionSignature): string {
  const returnType = sig.returnType.toLowerCase();

  // Handle Promise types
  if (returnType.startsWith('promise<')) {
    const innerType = sig.returnType.slice(8, -1); // Extract inner type
    return generateValueForType(innerType);
  }

  return generateValueForType(sig.returnType);
}

/**
 * Generate a value for a given type
 */
function generateValueForType(type: string): string {
  const normalized = type.toLowerCase().trim();

  // Primitives
  if (normalized === 'string') return "'test-value'";
  if (normalized === 'number') return '42';
  if (normalized === 'boolean') return 'true';
  if (normalized === 'void' || normalized === 'undefined') return 'undefined';
  if (normalized === 'null') return 'null';

  // Arrays
  if (normalized.endsWith('[]') || normalized.startsWith('array<')) {
    return '[]';
  }

  // Common types
  if (normalized === 'date') return 'new Date()';
  if (normalized === 'error') return "new Error('mock error')";
  if (normalized === 'buffer') return "Buffer.from('test')";

  // Objects and custom types - return empty object with type assertion
  if (normalized === 'object' || normalized === 'record<string, any>') {
    return '{}';
  }

  // For custom types, return a typed empty object
  return `{} as ${type}`;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format mock instructions as a string for the prompt
 */
export function formatMockInstructions(
  instructions: MockInstruction[],
  framework: TestFramework
): string {
  if (instructions.length === 0) {
    return 'No dependencies require mocking.';
  }

  const lines: string[] = [
    `## Mock Setup for ${framework}`,
    '',
    '```typescript',
    '// Module mocks (place at top of test file, before imports)',
  ];

  // Add mock calls
  for (const inst of instructions) {
    lines.push(inst.mockCode);
  }

  lines.push('');
  lines.push('// Mock implementations (place in beforeEach or individual tests)');

  // Add setup code
  for (const inst of instructions) {
    if (inst.setupCode) {
      lines.push(inst.setupCode);
    }
  }

  lines.push('```');

  return lines.join('\n');
}

// =============================================================================
// Edge Case Analysis (Story 5.6)
// =============================================================================

export interface EdgeCase {
  category: EdgeCaseCategory;
  description: string;
  testName: string;
  inputValue: string;
  expectedBehavior: string;
}

export type EdgeCaseCategory =
  | 'null_undefined'
  | 'empty_values'
  | 'boundary'
  | 'error_condition'
  | 'async_rejection'
  | 'type_coercion';

/**
 * Analyze function signatures to identify edge cases
 */
export function analyzeEdgeCases(
  signatures: FunctionSignature[]
): EdgeCase[] {
  const edgeCases: EdgeCase[] = [];

  for (const sig of signatures) {
    edgeCases.push(...analyzeSignatureEdgeCases(sig));
  }

  return edgeCases;
}

/**
 * Analyze a single function signature for edge cases
 */
function analyzeSignatureEdgeCases(sig: FunctionSignature): EdgeCase[] {
  const cases: EdgeCase[] = [];
  const funcName = sig.name;

  // Analyze parameters for edge cases
  for (const param of sig.params) {
    cases.push(...analyzeParameterEdgeCases(funcName, param));
  }

  // Add async-specific edge cases
  if (sig.isAsync) {
    cases.push({
      category: 'async_rejection',
      description: `${funcName} rejects with error`,
      testName: `should handle rejection when ${funcName} fails`,
      inputValue: 'async rejection',
      expectedBehavior: 'throws or rejects with expected error',
    });
  }

  // Add general error condition
  cases.push({
    category: 'error_condition',
    description: `${funcName} handles invalid input`,
    testName: `should throw/return error for invalid input to ${funcName}`,
    inputValue: 'invalid or malformed input',
    expectedBehavior: 'throws error or returns error result',
  });

  return cases;
}

/**
 * Analyze a parameter for edge cases
 */
function analyzeParameterEdgeCases(funcName: string, param: ParameterInfo): EdgeCase[] {
  const cases: EdgeCase[] = [];
  const paramName = param.name;
  const paramType = param.type.toLowerCase();

  // Null/undefined cases (if parameter is optional or nullable)
  if (param.isOptional || paramType.includes('null') || paramType.includes('undefined')) {
    cases.push({
      category: 'null_undefined',
      description: `${funcName} with null/undefined ${paramName}`,
      testName: `should handle null/undefined ${paramName}`,
      inputValue: 'null or undefined',
      expectedBehavior: 'handles gracefully without throwing',
    });
  }

  // String edge cases
  if (paramType === 'string' || paramType.includes('string')) {
    cases.push({
      category: 'empty_values',
      description: `${funcName} with empty string ${paramName}`,
      testName: `should handle empty string ${paramName}`,
      inputValue: "''",
      expectedBehavior: 'handles empty string appropriately',
    });
  }

  // Number edge cases
  if (paramType === 'number' || paramType.includes('number')) {
    cases.push({
      category: 'boundary',
      description: `${funcName} with zero ${paramName}`,
      testName: `should handle zero value for ${paramName}`,
      inputValue: '0',
      expectedBehavior: 'handles zero correctly',
    });

    cases.push({
      category: 'boundary',
      description: `${funcName} with negative ${paramName}`,
      testName: `should handle negative value for ${paramName}`,
      inputValue: '-1',
      expectedBehavior: 'handles negative numbers correctly',
    });
  }

  // Array edge cases
  if (paramType.includes('[]') || paramType.includes('array')) {
    cases.push({
      category: 'empty_values',
      description: `${funcName} with empty array ${paramName}`,
      testName: `should handle empty array ${paramName}`,
      inputValue: '[]',
      expectedBehavior: 'handles empty array without error',
    });
  }

  // Object edge cases
  if (paramType === 'object' || paramType.includes('record') || paramType.includes('{')) {
    cases.push({
      category: 'empty_values',
      description: `${funcName} with empty object ${paramName}`,
      testName: `should handle empty object ${paramName}`,
      inputValue: '{}',
      expectedBehavior: 'handles empty object appropriately',
    });
  }

  return cases;
}

/**
 * Format edge cases as instructions for the prompt
 */
export function formatEdgeCaseInstructions(edgeCases: EdgeCase[]): string {
  if (edgeCases.length === 0) {
    return '';
  }

  // Group by category
  const byCategory = new Map<EdgeCaseCategory, EdgeCase[]>();
  for (const ec of edgeCases) {
    const existing = byCategory.get(ec.category) || [];
    existing.push(ec);
    byCategory.set(ec.category, existing);
  }

  const lines: string[] = [
    '## Required Edge Cases',
    '',
    'Generate tests for the following edge cases:',
    '',
  ];

  const categoryLabels: Record<EdgeCaseCategory, string> = {
    null_undefined: 'Null/Undefined Handling',
    empty_values: 'Empty Values',
    boundary: 'Boundary Conditions',
    error_condition: 'Error Conditions',
    async_rejection: 'Async Rejections',
    type_coercion: 'Type Coercion',
  };

  for (const [category, cases] of byCategory) {
    lines.push(`### ${categoryLabels[category]}`);
    for (const ec of cases.slice(0, 3)) { // Limit to 3 per category
      lines.push(`- ${ec.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get minimum required edge cases count based on function complexity
 */
export function getRequiredEdgeCaseCount(signatures: FunctionSignature[]): number {
  // Base: 3 edge cases minimum
  let count = 3;

  // Add more based on complexity
  for (const sig of signatures) {
    // Add 1 for each async function
    if (sig.isAsync) count++;

    // Add 1 for each function with 3+ parameters
    if (sig.params.length >= 3) count++;
  }

  // Cap at 10
  return Math.min(count, 10);
}

// =============================================================================
// Combined Analysis
// =============================================================================

export interface TestGenerationAnalysis {
  framework: TestFramework;
  mockInstructions: MockInstruction[];
  edgeCases: EdgeCase[];
  requiredEdgeCaseCount: number;
  mockInstructionsText: string;
  edgeCaseInstructionsText: string;
}

/**
 * Perform complete analysis for test generation
 */
export async function analyzeForTestGeneration(
  dependencies: DependencyInfo[],
  signatures: FunctionSignature[],
  options?: {
    projectDir?: string;
    frameworkOverride?: TestFramework;
  }
): Promise<TestGenerationAnalysis> {
  const framework = await detectFramework(
    options?.projectDir,
    options?.frameworkOverride
  );

  const mockInstructions = generateMockInstructions(dependencies, framework);
  const edgeCases = analyzeEdgeCases(signatures);
  const requiredEdgeCaseCount = getRequiredEdgeCaseCount(signatures);

  return {
    framework,
    mockInstructions,
    edgeCases,
    requiredEdgeCaseCount,
    mockInstructionsText: formatMockInstructions(mockInstructions, framework),
    edgeCaseInstructionsText: formatEdgeCaseInstructions(edgeCases),
  };
}
