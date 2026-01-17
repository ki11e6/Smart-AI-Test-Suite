/**
 * Smart AI Test Suit - Prompt Builder Service
 * Builds prompts for LLM interactions.
 */

import { readFile } from '../utils/file.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  DependencyInfo,
  TestFramework,
  TestFailure,
  FixDescription,
  FunctionSignature,
} from '../types.js';
import {
  generateMockInstructions,
  formatMockInstructions,
  analyzeEdgeCases,
  formatEdgeCaseInstructions,
  getRequiredEdgeCaseCount,
} from './test-generation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');

// =============================================================================
// Prompt Templates
// =============================================================================

let unitTestTemplate: string | null = null;
let fixTestTemplate: string | null = null;
let analyzeFailureTemplate: string | null = null;

async function loadTemplate(name: string): Promise<string> {
  const path = join(PROMPTS_DIR, `${name}.md`);
  return readFile(path);
}

async function getUnitTestTemplate(): Promise<string> {
  if (!unitTestTemplate) {
    unitTestTemplate = await loadTemplate('unit-test');
  }
  return unitTestTemplate;
}

async function getFixTestTemplate(): Promise<string> {
  if (!fixTestTemplate) {
    fixTestTemplate = await loadTemplate('fix-test');
  }
  return fixTestTemplate;
}

async function getAnalyzeFailureTemplate(): Promise<string> {
  if (!analyzeFailureTemplate) {
    analyzeFailureTemplate = await loadTemplate('analyze-failure');
  }
  return analyzeFailureTemplate;
}

// =============================================================================
// Template Rendering
// =============================================================================

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName, content) => {
      return variables[varName] ? content : '';
    }
  );

  return result;
}

// =============================================================================
// Prompt Builders
// =============================================================================

export interface TestGenerationPromptInput {
  sourceCode: string;
  language: 'typescript' | 'javascript';
  dependencies: DependencyInfo[];
  framework: TestFramework;
  functionSignatures?: FunctionSignature[];
}

export async function buildTestGenerationPrompt(
  input: TestGenerationPromptInput
): Promise<string> {
  const template = await getUnitTestTemplate();

  const dependenciesText = formatDependencies(input.dependencies);

  // Generate mock instructions
  const mockInstructions = generateMockInstructions(input.dependencies, input.framework);
  const mockInstructionsText = mockInstructions.length > 0
    ? formatMockInstructions(mockInstructions, input.framework)
    : '';

  // Analyze edge cases from function signatures
  const signatures = input.functionSignatures || extractSignaturesFromDependencies(input.dependencies);
  const edgeCases = analyzeEdgeCases(signatures);
  const edgeCaseInstructionsText = formatEdgeCaseInstructions(edgeCases);
  const minEdgeCases = getRequiredEdgeCaseCount(signatures);

  return renderTemplate(template, {
    source_code: input.sourceCode,
    language: input.language,
    dependencies: dependenciesText,
    framework: input.framework,
    vitest: input.framework === 'vitest' ? 'true' : '',
    jest: input.framework === 'jest' ? 'true' : '',
    mocha: input.framework === 'mocha' ? 'true' : '',
    mock_instructions: mockInstructionsText,
    edge_case_instructions: edgeCaseInstructionsText,
    min_edge_cases: String(minEdgeCases),
  });
}

/**
 * Extract function signatures from dependencies
 */
function extractSignaturesFromDependencies(dependencies: DependencyInfo[]): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];
  for (const dep of dependencies) {
    signatures.push(...dep.functionSignatures);
  }
  return signatures;
}

export interface FixTestPromptInput {
  testCode: string;
  sourceCode: string;
  language: 'typescript' | 'javascript';
  failures: TestFailure[];
  attempt: number;
  maxRetries: number;
  previousFixes?: FixDescription[];
}

export async function buildFixTestPrompt(input: FixTestPromptInput): Promise<string> {
  const template = await getFixTestTemplate();

  const failuresText = formatFailures(input.failures);
  const previousFixesText = input.previousFixes
    ? formatPreviousFixes(input.previousFixes)
    : '';

  return renderTemplate(template, {
    test_code: input.testCode,
    source_code: input.sourceCode,
    language: input.language,
    failures: failuresText,
    attempt: String(input.attempt),
    max_retries: String(input.maxRetries),
    previous_fixes: previousFixesText,
  });
}

export interface AnalyzeFailurePromptInput {
  testOutput: string;
  testCode: string;
  sourceCode: string;
  language: 'typescript' | 'javascript';
}

export async function buildAnalyzeFailurePrompt(
  input: AnalyzeFailurePromptInput
): Promise<string> {
  const template = await getAnalyzeFailureTemplate();

  return renderTemplate(template, {
    test_output: input.testOutput,
    test_code: input.testCode,
    source_code: input.sourceCode,
    language: input.language,
  });
}

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatDependencies(dependencies: DependencyInfo[]): string {
  if (dependencies.length === 0) {
    return 'No external dependencies to mock.';
  }

  const lines: string[] = [];

  for (const dep of dependencies) {
    lines.push(`### ${dep.path} ${dep.isExternal ? '(external package)' : '(local module)'}`);

    if (dep.functionSignatures.length > 0) {
      lines.push('\n**Functions:**');
      for (const sig of dep.functionSignatures) {
        const params = sig.params
          .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
          .join(', ');
        const asyncPrefix = sig.isAsync ? 'async ' : '';
        lines.push(`- \`${asyncPrefix}${sig.name}(${params}): ${sig.returnType}\``);
      }
    }

    if (dep.types.length > 0) {
      lines.push('\n**Types:**');
      for (const type of dep.types) {
        lines.push(`- \`${type.kind} ${type.name}\``);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatFailures(failures: TestFailure[]): string {
  if (failures.length === 0) {
    return 'No failures recorded.';
  }

  return failures
    .map((f, i) => {
      const lines = [
        `### Failure ${i + 1}: ${f.testName}`,
        '',
        `**Error:** ${f.errorMessage}`,
      ];

      if (f.expected !== undefined) {
        lines.push(`**Expected:** ${f.expected}`);
      }
      if (f.actual !== undefined) {
        lines.push(`**Actual:** ${f.actual}`);
      }
      if (f.stackTrace) {
        lines.push('', '**Stack Trace:**', '```', f.stackTrace, '```');
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

function formatPreviousFixes(fixes: FixDescription[]): string {
  return fixes
    .map(
      (f, i) =>
        `${i + 1}. **${f.testName}**: ${f.issue}\n   Fix: ${f.fix} (confidence: ${f.confidence})`
    )
    .join('\n');
}

function getFrameworkInstructions(framework: TestFramework): string {
  switch (framework) {
    case 'vitest':
      return `
- Use \`import { describe, it, expect, vi, beforeEach } from 'vitest';\`
- Use \`vi.mock()\` for mocking modules
- Use \`vi.mocked()\` for typed mocks
- Use \`vi.fn()\` for function mocks
- Use \`mockResolvedValue\` and \`mockRejectedValue\` for async mocks
`;
    case 'jest':
      return `
- Use \`import { describe, it, expect, jest, beforeEach } from '@jest/globals';\`
- Use \`jest.mock()\` for mocking modules
- Use \`jest.fn()\` for function mocks
- Use \`mockResolvedValue\` and \`mockRejectedValue\` for async mocks
`;
    case 'mocha':
      return `
- Use \`import { describe, it, before, beforeEach } from 'mocha';\`
- Use \`import { expect } from 'chai';\`
- Use \`import sinon from 'sinon';\` for mocking
`;
    default:
      return '';
  }
}

// =============================================================================
// Inline Prompt (Fallback)
// =============================================================================

export function buildInlineTestPrompt(input: TestGenerationPromptInput): string {
  const frameworkInstructions = getFrameworkInstructions(input.framework);
  const dependenciesText = formatDependencies(input.dependencies);

  // Generate mock instructions
  const mockInstructions = generateMockInstructions(input.dependencies, input.framework);
  const mockInstructionsText = mockInstructions.length > 0
    ? formatMockInstructions(mockInstructions, input.framework)
    : '';

  // Analyze edge cases
  const signatures = input.functionSignatures || extractSignaturesFromDependencies(input.dependencies);
  const edgeCases = analyzeEdgeCases(signatures);
  const edgeCaseInstructionsText = formatEdgeCaseInstructions(edgeCases);
  const minEdgeCases = getRequiredEdgeCaseCount(signatures);

  return `You are an expert test engineer. Generate comprehensive unit tests for the following source code.

## Source Code

\`\`\`${input.language}
${input.sourceCode}
\`\`\`

## Dependencies Context

The following dependencies are imported and should be mocked:

${dependenciesText}
${mockInstructionsText ? `\n${mockInstructionsText}\n` : ''}
## Test Framework

Use **${input.framework}** testing framework with the following patterns:
${frameworkInstructions}

## Requirements

1. **Mock all external dependencies** - No real API calls, file operations, or external services
2. **Include at least ${minEdgeCases} edge cases:**
   - Null/undefined inputs
   - Empty arrays/objects
   - Boundary values (0, -1, MAX_INT)
   - Error conditions
   - Async rejections (for async functions)
3. **Use proper import paths** - Include \`.js\` extension for ESM compatibility
4. **Type safety** - Ensure mocks return correctly typed values
5. **Descriptive test names** - Use format: \`it('should [action] when [condition]')\`
6. **Test isolation** - Each test should be independent, reset mocks between tests
${edgeCaseInstructionsText ? `\n${edgeCaseInstructionsText}\n` : ''}
## Output Format

Return ONLY the test code in a TypeScript code block. No explanations before or after.

\`\`\`typescript
// Your generated tests here
\`\`\`
`;
}
