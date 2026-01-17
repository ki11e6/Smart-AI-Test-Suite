/**
 * Smart AI Test Suit - Fixer Agent
 * Diagnoses test failures and generates corrections using LLM.
 */

import type {
  AgentContext,
  FixerInput,
  FixerOutput,
  FixDescription,
  TestFailure,
  FailureAnalysis,
} from './types.js';
import { BaseAgent } from './base.js';
import { buildFixTestPrompt, buildAnalyzeFailurePrompt } from '../services/prompt-builder.js';
import { extractTestCode } from '../utils/file.js';
import { ParseError } from '../utils/errors.js';

export class FixerAgent extends BaseAgent<FixerInput, FixerOutput> {
  readonly name = 'Fixer';

  /**
   * Fix failing tests
   */
  protected async run(input: FixerInput, context: AgentContext): Promise<FixerOutput> {
    const { testCode, testOutput, sourceCode, attempt, previousFixes } = input;

    // First, analyze the failures to understand them better
    const analyses = await this.analyzeFailures(
      testOutput.failures,
      testCode,
      sourceCode,
      context
    );

    // Build the fix prompt
    const prompt = await buildFixTestPrompt({
      testCode,
      sourceCode,
      language: 'typescript',
      failures: testOutput.failures,
      attempt,
      maxRetries: context.options.maxRetries,
      previousFixes,
    });

    // Call LLM to generate fixed code
    const response = await context.provider.generate(prompt, {
      temperature: 0.5, // Lower temperature for fixes
      maxTokens: 4096,
    });

    // Parse the fixed code
    let fixedCode: string;
    try {
      fixedCode = extractTestCode(response);
    } catch (error) {
      throw new ParseError(
        'Failed to extract fixed test code from LLM response',
        context.sourceFile,
        error instanceof Error ? error : undefined
      );
    }

    // Extract fix descriptions from analyses
    const fixesApplied = this.createFixDescriptions(testOutput.failures, analyses);

    return {
      fixedCode,
      fixesApplied,
    };
  }

  /**
   * Analyze test failures to determine root causes
   */
  private async analyzeFailures(
    failures: TestFailure[],
    testCode: string,
    sourceCode: string,
    context: AgentContext
  ): Promise<FailureAnalysis[]> {
    const analyses: FailureAnalysis[] = [];

    // For efficiency, we'll analyze up to 3 failures in detail
    const failuresToAnalyze = failures.slice(0, 3);

    for (const failure of failuresToAnalyze) {
      try {
        const analysis = await this.analyzeSingleFailure(
          failure,
          testCode,
          sourceCode,
          context
        );
        analyses.push(analysis);
      } catch {
        // If analysis fails, create a generic analysis
        analyses.push({
          rootCause: failure.errorMessage,
          errorType: this.inferErrorType(failure),
          suggestedFix: 'Review the test implementation',
          confidence: 'low',
        });
      }
    }

    return analyses;
  }

  /**
   * Analyze a single failure using LLM
   */
  private async analyzeSingleFailure(
    failure: TestFailure,
    testCode: string,
    sourceCode: string,
    context: AgentContext
  ): Promise<FailureAnalysis> {
    // Build a compact analysis prompt
    const prompt = await buildAnalyzeFailurePrompt({
      testOutput: this.formatFailureForAnalysis(failure),
      testCode,
      sourceCode,
      language: 'typescript',
    });

    const response = await context.provider.generate(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    });

    // Try to parse JSON response
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as FailureAnalysis;
      }

      // Try parsing the whole response as JSON
      return JSON.parse(response) as FailureAnalysis;
    } catch {
      // If JSON parsing fails, create analysis from response text
      return {
        rootCause: failure.errorMessage,
        errorType: this.inferErrorType(failure),
        suggestedFix: response.slice(0, 200),
        confidence: 'medium',
      };
    }
  }

  /**
   * Format a failure for analysis
   */
  private formatFailureForAnalysis(failure: TestFailure): string {
    const lines = [
      `Test: ${failure.testName}`,
      `Error: ${failure.errorMessage}`,
    ];

    if (failure.expected) {
      lines.push(`Expected: ${failure.expected}`);
    }
    if (failure.actual) {
      lines.push(`Actual: ${failure.actual}`);
    }
    if (failure.stackTrace) {
      lines.push(`Stack: ${failure.stackTrace.slice(0, 500)}`);
    }

    return lines.join('\n');
  }

  /**
   * Infer error type from failure
   */
  private inferErrorType(failure: TestFailure): FailureAnalysis['errorType'] {
    const message = failure.errorMessage.toLowerCase();

    if (message.includes('mock') || message.includes('spy') || message.includes('stub')) {
      return 'mock';
    }

    if (
      message.includes('type') ||
      message.includes('undefined is not') ||
      message.includes('cannot read property')
    ) {
      return 'type';
    }

    if (
      message.includes('async') ||
      message.includes('promise') ||
      message.includes('await') ||
      message.includes('timeout')
    ) {
      return 'async';
    }

    if (
      message.includes('import') ||
      message.includes('module') ||
      message.includes('cannot find')
    ) {
      return 'import';
    }

    if (
      message.includes('expect') ||
      message.includes('assertion') ||
      message.includes('equal')
    ) {
      return 'test_logic';
    }

    return 'source_logic';
  }

  /**
   * Create fix descriptions from failures and analyses
   */
  private createFixDescriptions(
    failures: TestFailure[],
    analyses: FailureAnalysis[]
  ): FixDescription[] {
    return failures.map((failure, index) => {
      const analysis = analyses[index] ?? {
        rootCause: failure.errorMessage,
        errorType: 'test_logic',
        suggestedFix: 'Unknown fix',
        confidence: 'low' as const,
      };

      return {
        testName: failure.testName,
        issue: analysis.rootCause,
        fix: analysis.suggestedFix,
        confidence: analysis.confidence,
      };
    });
  }
}
