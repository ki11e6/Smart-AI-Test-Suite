/**
 * Smart AI Test Suit - Test Runner Service
 * Spawns test framework subprocess and parses output.
 */

import { spawn } from 'node:child_process';
import { dirname, basename } from 'node:path';
import type {
  TestFramework,
  TestRunOutput,
  TestFailure,
  HealingAttempt,
  FixDescription,
} from '../types.js';

// =============================================================================
// Test Runner
// =============================================================================

export interface TestRunnerOptions {
  framework: TestFramework;
  cwd?: string;
  timeout?: number;
  verbose?: boolean;
}

export interface TestRunner {
  run(testFile: string, options: TestRunnerOptions): Promise<TestRunOutput>;
}

/**
 * Run tests using the specified framework
 */
export async function runTests(
  testFile: string,
  options: TestRunnerOptions
): Promise<TestRunOutput> {
  const { framework, cwd, timeout = 60000, verbose } = options;
  const testDir = cwd ?? dirname(testFile);
  const testFileName = basename(testFile);

  const { command, args } = getTestCommand(framework, testFileName);

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(command, args, {
      cwd: testDir,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0', // Disable colors for easier parsing
        CI: 'true', // Force CI mode for consistent output
      },
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (verbose) {
        process.stdout.write(data);
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      if (verbose) {
        process.stderr.write(data);
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const rawOutput = stdout + '\n' + stderr;

      if (timedOut) {
        resolve({
          success: false,
          totalTests: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          failures: [{
            testName: 'Test Suite',
            errorMessage: `Test execution timed out after ${timeout}ms`,
          }],
          duration,
          rawOutput,
        });
        return;
      }

      // Parse the output based on framework
      const parseResult = parseTestOutput(rawOutput, framework);

      resolve({
        success: code === 0,
        totalTests: parseResult.totalTests,
        passed: parseResult.passed,
        failed: parseResult.failed,
        skipped: parseResult.skipped,
        failures: parseResult.failures,
        duration,
        rawOutput,
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      resolve({
        success: false,
        totalTests: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        failures: [{
          testName: 'Test Runner',
          errorMessage: `Failed to start test process: ${error.message}`,
        }],
        duration,
        rawOutput: error.message,
      });
    });
  });
}

/**
 * Get the command and args for running tests
 */
function getTestCommand(
  framework: TestFramework,
  testFile: string
): { command: string; args: string[] } {
  switch (framework) {
    case 'vitest':
      return {
        command: 'npx',
        args: ['vitest', 'run', testFile, '--reporter=verbose', '--no-color'],
      };

    case 'jest':
      return {
        command: 'npx',
        args: ['jest', testFile, '--verbose', '--no-color', '--forceExit'],
      };

    case 'mocha':
      return {
        command: 'npx',
        args: ['mocha', testFile, '--reporter=spec', '--no-color'],
      };

    default:
      throw new Error(`Unsupported test framework: ${framework}`);
  }
}

// =============================================================================
// Failure Parser
// =============================================================================

interface ParsedTestResult {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
}

/**
 * Parse test output from various frameworks
 */
export function parseTestOutput(
  output: string,
  framework: TestFramework
): ParsedTestResult {
  switch (framework) {
    case 'vitest':
      return parseVitestOutput(output);

    case 'jest':
      return parseJestOutput(output);

    case 'mocha':
      return parseMochaOutput(output);

    default:
      return parseGenericOutput(output);
  }
}

/**
 * Parse Vitest output
 */
function parseVitestOutput(output: string): ParsedTestResult {
  const failures: TestFailure[] = [];

  // Extract test counts from summary
  // Pattern: "Tests  X failed | Y passed (Z)" or "Tests  Y passed (Z)"
  const summaryMatch = output.match(
    /Tests\s+(?:(\d+)\s+failed\s*\|?\s*)?(\d+)\s+passed\s*(?:\|\s*(\d+)\s+skipped)?\s*\((\d+)\)/
  );

  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  if (summaryMatch) {
    failed = parseInt(summaryMatch[1] || '0', 10);
    passed = parseInt(summaryMatch[2] || '0', 10);
    skipped = parseInt(summaryMatch[3] || '0', 10);
    totalTests = parseInt(summaryMatch[4] || '0', 10);
  }

  // Extract failures
  // Pattern: "FAIL  <test_name>" followed by error details
  const failureBlockRegex = /(?:FAIL|×)\s+(.+?)(?:\n|$)([\s\S]*?)(?=(?:FAIL|×|\n\s*Tests\s|\z))/g;
  let match;

  while ((match = failureBlockRegex.exec(output)) !== null) {
    const testName = match[1].trim();
    const errorBlock = match[2];

    const failure = extractFailureDetails(testName, errorBlock);
    failures.push(failure);
  }

  // Alternative pattern for vitest's more structured output
  // "⎯⎯⎯⎯ Failed Tests N ⎯⎯⎯⎯"
  const failedTestsSection = output.match(
    /Failed Tests[\s\S]*?(?=Duration|$)/
  );

  if (failedTestsSection && failures.length === 0) {
    // Parse individual test failures from this section
    const testFailures = failedTestsSection[0].matchAll(
      /FAIL\s+(.+?)\s*>\s*(.+?)(?:\n|$)([\s\S]*?)(?=FAIL|$)/g
    );

    for (const failMatch of testFailures) {
      const suiteName = failMatch[1].trim();
      const testName = failMatch[2].trim();
      const errorBlock = failMatch[3];

      const failure = extractFailureDetails(`${suiteName} > ${testName}`, errorBlock);
      failures.push(failure);
    }
  }

  // If we found failures but no count, set the count
  if (failures.length > 0 && failed === 0) {
    failed = failures.length;
    totalTests = passed + failed + skipped;
  }

  return { totalTests, passed, failed, skipped, failures };
}

/**
 * Parse Jest output
 */
function parseJestOutput(output: string): ParsedTestResult {
  const failures: TestFailure[] = [];

  // Extract test counts from summary
  // Pattern: "Tests:       X failed, Y passed, Z total"
  const summaryMatch = output.match(
    /Tests:\s+(?:(\d+)\s+failed,\s+)?(?:(\d+)\s+skipped,\s+)?(?:(\d+)\s+passed,\s+)?(\d+)\s+total/
  );

  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  if (summaryMatch) {
    failed = parseInt(summaryMatch[1] || '0', 10);
    skipped = parseInt(summaryMatch[2] || '0', 10);
    passed = parseInt(summaryMatch[3] || '0', 10);
    totalTests = parseInt(summaryMatch[4] || '0', 10);
  }

  // Extract failures from Jest's format
  // Pattern: "● <describe> › <test_name>"
  const failureBlockRegex = /●\s+(.+?)(?:\n|$)([\s\S]*?)(?=●|\n\s*Tests:|\z)/g;
  let match;

  while ((match = failureBlockRegex.exec(output)) !== null) {
    const testName = match[1].trim();
    const errorBlock = match[2];

    const failure = extractFailureDetails(testName, errorBlock);
    failures.push(failure);
  }

  // If we found failures but no count, set the count
  if (failures.length > 0 && failed === 0) {
    failed = failures.length;
    totalTests = passed + failed + skipped;
  }

  return { totalTests, passed, failed, skipped, failures };
}

/**
 * Parse Mocha output
 */
function parseMochaOutput(output: string): ParsedTestResult {
  const failures: TestFailure[] = [];

  // Extract test counts from summary
  // Pattern: "X passing" and "Y failing"
  const passingMatch = output.match(/(\d+)\s+passing/);
  const failingMatch = output.match(/(\d+)\s+failing/);
  const pendingMatch = output.match(/(\d+)\s+pending/);

  const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
  const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
  const skipped = pendingMatch ? parseInt(pendingMatch[1], 10) : 0;
  const totalTests = passed + failed + skipped;

  // Extract failures from Mocha's format
  // Pattern: "1) <suite> <test>:" followed by error
  const failureBlockRegex = /\d+\)\s+(.+?):\s*\n([\s\S]*?)(?=\d+\)|\n\s*passing|\z)/g;
  let match;

  while ((match = failureBlockRegex.exec(output)) !== null) {
    const testName = match[1].trim();
    const errorBlock = match[2];

    const failure = extractFailureDetails(testName, errorBlock);
    failures.push(failure);
  }

  return { totalTests, passed, failed, skipped, failures };
}

/**
 * Parse generic test output (fallback)
 */
function parseGenericOutput(output: string): ParsedTestResult {
  const failures: TestFailure[] = [];

  // Look for common error patterns
  const errorPatterns = [
    /Error:\s*(.+)/g,
    /AssertionError:\s*(.+)/g,
    /expect\((.+?)\)\.(.+?)\((.+?)\)/g,
  ];

  for (const pattern of errorPatterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        testName: 'Unknown Test',
        errorMessage: match[0],
      });
    }
  }

  const failed = failures.length;
  const passed = output.includes('pass') ? 1 : 0;

  return {
    totalTests: passed + failed,
    passed,
    failed,
    skipped: 0,
    failures,
  };
}

/**
 * Extract detailed failure information from error block
 */
function extractFailureDetails(testName: string, errorBlock: string): TestFailure {
  const failure: TestFailure = {
    testName,
    errorMessage: '',
  };

  // Extract error message
  // Common patterns: "Error: ...", "AssertionError: ...", "expect(...)..."
  const errorMatch = errorBlock.match(
    /(?:Error|AssertionError|TypeError|ReferenceError):\s*(.+?)(?:\n|$)/
  );

  if (errorMatch) {
    failure.errorMessage = errorMatch[1].trim();
  } else {
    // Try to get the first non-empty line
    const firstLine = errorBlock.split('\n').find(line => line.trim());
    failure.errorMessage = firstLine?.trim() || 'Unknown error';
  }

  // Extract expected/actual values
  // Pattern: "Expected: ..." and "Received: ..." (Jest)
  // Pattern: "- Expected" and "+ Received" (Vitest)
  const expectedMatch = errorBlock.match(/(?:Expected|expected)[:\s]+(.+?)(?:\n|$)/i);
  const actualMatch = errorBlock.match(/(?:Received|Actual|actual)[:\s]+(.+?)(?:\n|$)/i);

  if (expectedMatch) {
    failure.expected = expectedMatch[1].trim();
  }
  if (actualMatch) {
    failure.actual = actualMatch[1].trim();
  }

  // Extract line number from stack trace
  const lineMatch = errorBlock.match(/:(\d+):\d+\)?$/m);
  if (lineMatch) {
    failure.line = parseInt(lineMatch[1], 10);
  }

  // Extract stack trace (first few lines)
  const stackMatch = errorBlock.match(/(at\s+.+(?:\n\s+at\s+.+)*)/);
  if (stackMatch) {
    failure.stackTrace = stackMatch[1].split('\n').slice(0, 5).join('\n');
  }

  return failure;
}

// =============================================================================
// Fix History Tracking
// =============================================================================

export interface FixHistory {
  attempts: HealingAttempt[];
  currentAttempt: number;
  maxRetries: number;
}

/**
 * Create a new fix history tracker
 */
export function createFixHistory(maxRetries: number): FixHistory {
  return {
    attempts: [],
    currentAttempt: 0,
    maxRetries,
  };
}

/**
 * Record a healing attempt
 */
export function recordAttempt(
  history: FixHistory,
  failures?: TestFailure[],
  fixes?: FixDescription[],
  error?: { code: string; message: string; recoverable: boolean }
): HealingAttempt {
  history.currentAttempt++;

  const attempt: HealingAttempt = {
    attempt: history.currentAttempt,
    failures,
    fixes,
    error,
  };

  history.attempts.push(attempt);
  return attempt;
}

/**
 * Get all previous fixes from history
 */
export function getPreviousFixes(history: FixHistory): FixDescription[] {
  const fixes: FixDescription[] = [];

  for (const attempt of history.attempts) {
    if (attempt.fixes) {
      fixes.push(...attempt.fixes);
    }
  }

  return fixes;
}

/**
 * Check if more retries are available
 */
export function hasRetriesRemaining(history: FixHistory): boolean {
  return history.currentAttempt < history.maxRetries;
}

/**
 * Get remaining retry count
 */
export function getRemainingRetries(history: FixHistory): number {
  return Math.max(0, history.maxRetries - history.currentAttempt);
}

// =============================================================================
// Healing Progress Display
// =============================================================================

export interface HealingProgressOptions {
  verbose?: boolean;
  colors?: boolean;
}

/**
 * Format healing progress for display
 */
export function formatHealingProgress(
  history: FixHistory,
  currentResult: TestRunOutput,
  options: HealingProgressOptions = {}
): string {
  const lines: string[] = [];
  const { verbose = false } = options;

  // Header
  lines.push('');
  lines.push(`Self-Healing Progress (Attempt ${history.currentAttempt}/${history.maxRetries})`);
  lines.push('='.repeat(50));

  // Current status
  if (currentResult.success) {
    lines.push('Status: All tests passing');
  } else {
    lines.push(`Status: ${currentResult.failed} of ${currentResult.totalTests} tests failing`);
  }

  // Test summary
  lines.push('');
  lines.push('Test Results:');
  lines.push(`  Passed:  ${currentResult.passed}`);
  lines.push(`  Failed:  ${currentResult.failed}`);
  lines.push(`  Skipped: ${currentResult.skipped}`);
  lines.push(`  Total:   ${currentResult.totalTests}`);

  // Current failures
  if (currentResult.failures.length > 0) {
    lines.push('');
    lines.push('Current Failures:');

    for (const failure of currentResult.failures) {
      lines.push(`  - ${failure.testName}`);
      lines.push(`    ${failure.errorMessage}`);

      if (verbose && failure.expected && failure.actual) {
        lines.push(`    Expected: ${failure.expected}`);
        lines.push(`    Actual: ${failure.actual}`);
      }
    }
  }

  // History summary
  if (history.attempts.length > 0 && verbose) {
    lines.push('');
    lines.push('Attempt History:');

    for (const attempt of history.attempts) {
      const fixCount = attempt.fixes?.length ?? 0;
      const failCount = attempt.failures?.length ?? 0;
      lines.push(
        `  Attempt ${attempt.attempt}: ${fixCount} fixes applied, ${failCount} failures`
      );
    }
  }

  // Remaining retries
  const remaining = getRemainingRetries(history);
  if (remaining > 0) {
    lines.push('');
    lines.push(`Remaining attempts: ${remaining}`);
  } else if (!currentResult.success) {
    lines.push('');
    lines.push('No more retry attempts available.');
  }

  lines.push('='.repeat(50));
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Factory Functions
// =============================================================================

let sharedRunner: TestRunner | null = null;

/**
 * Get shared test runner instance
 */
export function getTestRunner(): TestRunner {
  if (!sharedRunner) {
    sharedRunner = {
      run: runTests,
    };
  }
  return sharedRunner;
}

/**
 * Create a new test runner instance
 */
export function createTestRunner(): TestRunner {
  return {
    run: runTests,
  };
}
