/**
 * Smart AI Test Suit - Writer Agent
 * Generates test code using LLM.
 */

import type {
  AgentContext,
  WriterInput,
  WriterOutput,
  MockInfo,
} from './types.js';
import { BaseAgent } from './base.js';
import {
  buildTestGenerationPrompt,
  buildInlineTestPrompt,
} from '../services/prompt-builder.js';
import { extractTestCode } from '../utils/file.js';
import { ParseError } from '../utils/errors.js';

export class WriterAgent extends BaseAgent<WriterInput, WriterOutput> {
  readonly name = 'Writer';

  /**
   * Generate tests for the given source code
   */
  protected async run(input: WriterInput, context: AgentContext): Promise<WriterOutput> {
    const { sourceCode, dependencies, framework } = input;

    // Build the prompt
    let prompt: string;
    try {
      prompt = await buildTestGenerationPrompt({
        sourceCode,
        language: 'typescript', // Default to TypeScript
        dependencies,
        framework,
      });
    } catch {
      // Fallback to inline prompt if template loading fails
      prompt = buildInlineTestPrompt({
        sourceCode,
        language: 'typescript',
        dependencies,
        framework,
      });
    }

    // Call LLM
    const response = await context.provider.generate(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Parse response
    let testCode: string;
    try {
      testCode = extractTestCode(response);
    } catch (error) {
      throw new ParseError(
        'Failed to extract test code from LLM response',
        context.sourceFile,
        error instanceof Error ? error : undefined
      );
    }

    // Analyze generated tests
    const analysis = this.analyzeGeneratedTests(testCode, dependencies);

    return {
      testCode,
      testCount: analysis.testCount,
      edgeCases: analysis.edgeCases,
      mocks: analysis.mocks,
    };
  }

  /**
   * Analyze the generated test code
   */
  private analyzeGeneratedTests(
    testCode: string,
    dependencies: import('./types.js').DependencyInfo[]
  ): { testCount: number; edgeCases: string[]; mocks: MockInfo[] } {
    // Count tests (it() or test() calls)
    const testMatches = testCode.match(/\b(it|test)\s*\(/g);
    const testCount = testMatches?.length ?? 0;

    // Identify edge cases from test names
    const edgeCases: string[] = [];
    const edgeCasePatterns = [
      /null|undefined|empty|invalid|error|fail|reject|throw|boundary|zero|negative|max|min|edge/i,
    ];

    const testNameMatches = testCode.matchAll(
      /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
    );
    for (const match of testNameMatches) {
      const testName = match[1];
      if (edgeCasePatterns.some((pattern) => pattern.test(testName))) {
        edgeCases.push(testName);
      }
    }

    // Identify mocked modules
    const mocks: MockInfo[] = [];
    const mockMatches = testCode.matchAll(
      /(?:vi\.mock|jest\.mock)\s*\(\s*['"`]([^'"`]+)['"`]/g
    );

    for (const match of mockMatches) {
      const modulePath = match[1];
      const isExternal = !modulePath.startsWith('.') && !modulePath.startsWith('/');

      // Find corresponding dependency
      const dep = dependencies.find((d) => d.path === modulePath);
      const functions = dep?.functionSignatures.map((f) => f.name) ?? [];

      mocks.push({
        modulePath,
        functions,
        isExternal,
      });
    }

    return {
      testCount,
      edgeCases,
      mocks,
    };
  }
}
