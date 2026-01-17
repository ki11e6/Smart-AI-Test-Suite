/**
 * Smart AI Test Suit - Orchestrator Agent
 * Coordinates the test generation pipeline.
 */

import type {
  AgentContext,
  OrchestratorInput,
  OrchestratorOutput,
  PipelineMetrics,
  PipelineState,
  ProgressCallback,
  LLMProvider,
  GenerationOptions,
  TestRunOutput,
} from './types.js';
import { BaseAgent } from './base.js';
import { AnalyzerAgent } from './analyzer.js';
import { WriterAgent } from './writer.js';
import { ValidatorAgent } from './validator.js';
import { FixerAgent } from './fixer.js';
import { getTestFilePath, writeFile, toAbsolutePath } from '../utils/file.js';
import { GenerationError } from '../utils/errors.js';
import {
  runTests as executeTests,
  createFixHistory,
  recordAttempt,
  getPreviousFixes,
  hasRetriesRemaining,
  formatHealingProgress,
  type FixHistory,
} from '../services/test-runner.js';

export class OrchestratorAgent extends BaseAgent<OrchestratorInput, OrchestratorOutput> {
  readonly name = 'Orchestrator';

  private analyzer: AnalyzerAgent;
  private writer: WriterAgent;
  private validator: ValidatorAgent;
  private fixer: FixerAgent;
  private progressCallback?: ProgressCallback;

  constructor(options?: { onProgress?: ProgressCallback }) {
    super();
    this.analyzer = new AnalyzerAgent();
    this.writer = new WriterAgent();
    this.validator = new ValidatorAgent();
    this.fixer = new FixerAgent();
    this.progressCallback = options?.onProgress;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Run the orchestration pipeline
   */
  protected async run(input: OrchestratorInput, context: AgentContext): Promise<OrchestratorOutput> {
    const { file, options } = input;
    const absolutePath = toAbsolutePath(file);

    const state: PipelineState = {
      sourceFile: absolutePath,
      errors: [],
    };

    const metrics: PipelineMetrics = {
      totalDuration: 0,
      analyzerDuration: 0,
      writerDuration: 0,
      validatorDuration: 0,
      llmCalls: 0,
    };

    const startTime = Date.now();

    try {
      // Phase 1: Analyze
      this.reportProgress('analyzing', file, 'Analyzing source file...');
      const analyzerStart = Date.now();

      const analyzerResult = await this.analyzer.execute(
        { filePath: absolutePath },
        context
      );

      metrics.analyzerDuration = Date.now() - analyzerStart;

      if (!analyzerResult.success || !analyzerResult.data) {
        throw new GenerationError(
          file,
          `Analysis failed: ${analyzerResult.error?.message || 'Unknown error'}`
        );
      }

      state.sourceCode = analyzerResult.data.sourceCode;
      state.language = analyzerResult.data.language;
      state.imports = analyzerResult.data.imports;
      state.exports = analyzerResult.data.exports;
      state.dependencies = analyzerResult.data.dependencies;

      // Phase 2: Generate tests
      this.reportProgress('generating', file, 'Generating tests...');
      const writerStart = Date.now();

      const writerResult = await this.writer.execute(
        {
          sourceCode: state.sourceCode,
          dependencies: state.dependencies,
          framework: options.framework,
        },
        context
      );

      metrics.writerDuration = Date.now() - writerStart;
      metrics.llmCalls++;

      if (!writerResult.success || !writerResult.data) {
        throw new GenerationError(
          file,
          `Test generation failed: ${writerResult.error?.message || 'Unknown error'}`
        );
      }

      state.testCode = writerResult.data.testCode;
      state.testCount = writerResult.data.testCount;
      state.edgeCases = writerResult.data.edgeCases;
      state.mocks = writerResult.data.mocks;

      // Phase 3: Validate
      this.reportProgress('validating', file, 'Validating generated tests...');
      const validatorStart = Date.now();

      const validatorResult = await this.validator.execute(
        {
          testCode: state.testCode,
          sourceFile: absolutePath,
          dependencies: state.dependencies,
        },
        context
      );

      metrics.validatorDuration = Date.now() - validatorStart;

      if (validatorResult.success && validatorResult.data) {
        state.validationResult = validatorResult.data;

        // Use auto-fixed code if available
        if (validatorResult.data.fixedCode) {
          state.testCode = validatorResult.data.fixedCode;
        }
      }

      // Phase 4: Self-healing loop (if --run --fix enabled)
      let healingAttempts = 0;
      if (options.run && options.fix && !state.validationResult?.isValid) {
        healingAttempts = await this.runSelfHealingLoop(state, context, options, metrics);
      }

      // Write test file
      const testFilePath = getTestFilePath(absolutePath, { outputDir: options.outputDir });
      await writeFile(testFilePath, state.testCode);

      this.reportProgress('complete', file, 'Test generation complete');

      metrics.totalDuration = Date.now() - startTime;

      return {
        testFile: testFilePath,
        testCode: state.testCode,
        testCount: state.testCount ?? 0,
        edgeCases: state.edgeCases ?? [],
        validationPassed: state.validationResult?.isValid ?? false,
        healingAttempts: healingAttempts > 0 ? healingAttempts : undefined,
        metrics,
      };
    } catch (error) {
      this.reportProgress('error', file, `Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Run the self-healing loop
   */
  private async runSelfHealingLoop(
    state: PipelineState,
    context: AgentContext,
    options: GenerationOptions,
    metrics: PipelineMetrics
  ): Promise<number> {
    const maxRetries = options.maxRetries;
    const fixerStartTotal = Date.now();

    // Initialize fix history tracking
    const history: FixHistory = createFixHistory(maxRetries);

    while (hasRetriesRemaining(history)) {
      const attemptNumber = history.currentAttempt + 1;
      state.fixAttempts = attemptNumber;

      this.reportProgress(
        'running',
        state.sourceFile,
        `Running tests (attempt ${attemptNumber}/${maxRetries})...`,
        attemptNumber,
        maxRetries
      );

      // Run tests using the test runner service
      const testResult = await this.runTests(state.testCode!, state.sourceFile, context);

      if (testResult.success) {
        // Tests passed, record successful attempt
        recordAttempt(history, [], []);

        // Log progress if verbose
        if (options.verbose) {
          const progressOutput = formatHealingProgress(history, testResult, {
            verbose: true,
          });
          console.log(progressOutput);
        }

        break;
      }

      state.testRunResult = testResult;

      this.reportProgress(
        'fixing',
        state.sourceFile,
        `${testResult.failed} test(s) failed, attempting fix (${attemptNumber}/${maxRetries})...`,
        attemptNumber,
        maxRetries
      );

      // Call fixer agent with previous fix history
      const previousFixes = getPreviousFixes(history);
      const fixerResult = await this.fixer.execute(
        {
          testCode: state.testCode!,
          testOutput: testResult,
          sourceCode: state.sourceCode!,
          attempt: attemptNumber,
          previousFixes: previousFixes.length > 0 ? previousFixes : undefined,
        },
        context
      );

      metrics.llmCalls++;

      if (fixerResult.success && fixerResult.data) {
        // Record successful fix attempt
        recordAttempt(
          history,
          testResult.failures,
          fixerResult.data.fixesApplied
        );

        state.testCode = fixerResult.data.fixedCode;

        // Re-validate
        const revalidateResult = await this.validator.execute(
          {
            testCode: state.testCode,
            sourceFile: state.sourceFile,
            dependencies: state.dependencies ?? [],
          },
          context
        );

        if (revalidateResult.success && revalidateResult.data) {
          state.validationResult = revalidateResult.data;
          if (revalidateResult.data.fixedCode) {
            state.testCode = revalidateResult.data.fixedCode;
          }
        }

        // Log progress if verbose
        if (options.verbose) {
          const progressOutput = formatHealingProgress(history, testResult, {
            verbose: true,
          });
          console.log(progressOutput);
        }
      } else {
        // Record failed fix attempt
        const error = {
          code: fixerResult.error?.code ?? 'FIXER_ERROR',
          message: fixerResult.error?.message ?? 'Unknown error',
          recoverable: true,
        };

        recordAttempt(history, testResult.failures, undefined, error);

        state.errors.push({
          agent: 'Fixer',
          phase: `attempt-${attemptNumber}`,
          message: fixerResult.error?.message ?? 'Unknown error',
          recoverable: true,
          timestamp: Date.now(),
        });
      }
    }

    metrics.fixerDuration = Date.now() - fixerStartTotal;
    return history.currentAttempt;
  }

  /**
   * Run tests using the test runner service
   */
  private async runTests(
    testCode: string,
    sourceFile: string,
    context: AgentContext
  ): Promise<TestRunOutput> {
    // First, write the test code to a temporary file
    const testFilePath = getTestFilePath(sourceFile, {
      outputDir: context.options.outputDir,
    });

    // Ensure test file is written before running
    await writeFile(testFilePath, testCode);

    // Run tests using the test runner service
    const result = await executeTests(testFilePath, {
      framework: context.framework,
      timeout: context.options.timeout,
      verbose: context.options.verbose,
    });

    return result;
  }

  /**
   * Report progress
   */
  private reportProgress(
    phase: import('./types.js').ProgressPhase,
    file: string,
    message: string,
    current?: number,
    total?: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        file,
        message,
        current,
        total,
      });
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createOrchestrator(options?: {
  onProgress?: ProgressCallback;
}): OrchestratorAgent {
  return new OrchestratorAgent(options);
}

/**
 * Create an agent context from options
 */
export function createAgentContext(
  provider: LLMProvider,
  options: GenerationOptions,
  sourceFile: string,
  sourceCode: string = '',
  dependencies: import('./types.js').DependencyInfo[] = []
): AgentContext {
  return {
    sourceFile,
    sourceCode,
    dependencies,
    framework: options.framework,
    provider,
    options,
  };
}
