/**
 * Smart AI Test Suit - Progress Reporter
 * Provides progress reporting for both TUI and console modes.
 */

import type {
  ProgressPhase,
  ProgressUpdate,
  ProgressCallback,
  TestGenerationResult,
  CodebaseResult,
} from '../types.js';

// =============================================================================
// Agent Display Configuration
// =============================================================================

const AGENT_ICONS: Record<ProgressPhase, string> = {
  analyzing: '🔍',
  generating: '✍️',
  validating: '🧪',
  running: '▶️',
  fixing: '🔧',
  complete: '✅',
  error: '❌',
};

const AGENT_NAMES: Record<ProgressPhase, string> = {
  analyzing: 'Analyzer',
  generating: 'Writer',
  validating: 'Validator',
  running: 'Runner',
  fixing: 'Fixer',
  complete: 'Complete',
  error: 'Error',
};

// =============================================================================
// Progress Reporter Interface
// =============================================================================

export interface ProgressReporter {
  /** Report a progress update */
  report(update: ProgressUpdate): void;

  /** Report a generation result */
  reportResult(result: TestGenerationResult, duration: number): void;

  /** Report a batch result */
  reportBatchResult(result: CodebaseResult): void;

  /** Log a verbose message */
  verbose(message: string): void;

  /** Log verbose content with a title */
  verboseContent(title: string, content: string): void;

  /** Log an error */
  error(message: string, details?: string): void;

  /** Get the progress callback for use with other services */
  getCallback(): ProgressCallback;
}

// =============================================================================
// Console Progress Reporter
// =============================================================================

export interface ConsoleProgressReporterOptions {
  verbose?: boolean;
  silent?: boolean;
  showIcons?: boolean;
}

export class ConsoleProgressReporter implements ProgressReporter {
  private readonly verbose_: boolean;
  private readonly silent: boolean;
  private readonly showIcons: boolean;

  constructor(options: ConsoleProgressReporterOptions = {}) {
    this.verbose_ = options.verbose ?? false;
    this.silent = options.silent ?? false;
    this.showIcons = options.showIcons ?? true;
  }

  report(update: ProgressUpdate): void {
    if (this.silent) return;

    const icon = this.showIcons ? AGENT_ICONS[update.phase] : '';
    const name = AGENT_NAMES[update.phase];
    const progress = update.current !== undefined && update.total !== undefined
      ? ` [${update.current}/${update.total}]`
      : '';

    console.log(`${icon} ${name}:${progress} ${update.message}`);

    if (update.file && this.verbose_) {
      console.log(`   File: ${update.file}`);
    }
  }

  reportResult(result: TestGenerationResult, duration: number): void {
    if (this.silent) return;

    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'Generated tests' : 'Generation failed';

    console.log('');
    console.log(`${icon} ${status} for ${result.sourceFile}`);
    console.log(`   → Output: ${result.testFile}`);
    console.log(`   → Tests: ${result.testCount}${result.edgeCases.length > 0 ? ` (${result.edgeCases.length} edge cases)` : ''}`);

    if (result.healingAttempts !== undefined && result.healingAttempts > 0) {
      console.log(`   → Self-healed: ${result.healingAttempts} fix(es) applied`);
    }

    console.log(`   → Time: ${formatDuration(duration)}`);

    if (result.validationPassed) {
      console.log('   → Validation: Passed');
    }

    if (result.error) {
      console.log(`   → Error: ${result.error}`);
    }
  }

  reportBatchResult(result: CodebaseResult): void {
    if (this.silent) return;

    const totalTests = result.results.reduce((sum, r) => sum + r.testCount, 0);
    const totalEdgeCases = result.results.reduce((sum, r) => sum + r.edgeCases.length, 0);

    console.log('');
    console.log('═'.repeat(50));
    console.log('📊 Batch Generation Summary');
    console.log('═'.repeat(50));
    console.log('');
    console.log(`Files: ${result.totalFiles} (${result.successCount} success, ${result.failedCount} failed, ${result.skippedCount} skipped)`);
    console.log(`Tests Generated: ${totalTests}${totalEdgeCases > 0 ? ` (${totalEdgeCases} edge cases)` : ''}`);
    console.log(`Duration: ${formatDuration(result.duration)}`);
    console.log('');

    if (result.failedCount === 0) {
      console.log('✅ All files processed successfully!');
    } else {
      console.log('⚠️ Some files had issues:');
      for (const r of result.results.filter(r => !r.success)) {
        console.log(`   - ${r.sourceFile}: ${r.error || 'Unknown error'}`);
      }
    }

    console.log('═'.repeat(50));
  }

  verbose(message: string): void {
    if (!this.verbose_ || this.silent) return;
    console.log(`[verbose] ${message}`);
  }

  verboseContent(title: string, content: string): void {
    if (!this.verbose_ || this.silent) return;
    console.log('');
    console.log(`─── ${title} ───`);
    console.log(content);
    console.log('─'.repeat(title.length + 8));
  }

  error(message: string, details?: string): void {
    console.error(`❌ Error: ${message}`);
    if (details) {
      console.error(`   ${details}`);
    }
  }

  getCallback(): ProgressCallback {
    return (update: ProgressUpdate) => this.report(update);
  }
}

// =============================================================================
// Silent Progress Reporter (for stdout mode)
// =============================================================================

export class SilentProgressReporter implements ProgressReporter {
  report(_update: ProgressUpdate): void {
    // No output
  }

  reportResult(_result: TestGenerationResult, _duration: number): void {
    // No output
  }

  reportBatchResult(_result: CodebaseResult): void {
    // No output
  }

  verbose(_message: string): void {
    // No output
  }

  verboseContent(_title: string, _content: string): void {
    // No output
  }

  error(message: string, details?: string): void {
    // Only errors go to stderr
    console.error(`Error: ${message}`);
    if (details) {
      console.error(`  ${details}`);
    }
  }

  getCallback(): ProgressCallback {
    return () => {
      // No output
    };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export interface CreateProgressReporterOptions {
  verbose?: boolean;
  silent?: boolean;
  format?: 'file' | 'stdout' | 'json';
}

export function createProgressReporter(
  options: CreateProgressReporterOptions = {}
): ProgressReporter {
  if (options.silent || options.format === 'stdout') {
    return new SilentProgressReporter();
  }

  return new ConsoleProgressReporter({
    verbose: options.verbose,
    showIcons: true,
  });
}

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// =============================================================================
// Verbose Output Helpers
// =============================================================================

/**
 * Format a prompt for verbose display
 */
export function formatPromptForDisplay(prompt: string, maxLength = 2000): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  const half = Math.floor(maxLength / 2);
  return `${prompt.slice(0, half)}\n\n... [${prompt.length - maxLength} characters truncated] ...\n\n${prompt.slice(-half)}`;
}

/**
 * Format LLM response for verbose display
 */
export function formatResponseForDisplay(response: string, maxLength = 2000): string {
  return formatPromptForDisplay(response, maxLength);
}

/**
 * Format dependency info for verbose display
 */
export function formatDependenciesForDisplay(
  dependencies: Array<{ path: string; isExternal: boolean; functionSignatures: Array<{ name: string }> }>
): string {
  const lines: string[] = [];

  for (const dep of dependencies) {
    const type = dep.isExternal ? '(external)' : '(local)';
    const funcs = dep.functionSignatures.map(f => f.name).join(', ');
    lines.push(`  ${dep.path} ${type}`);
    if (funcs) {
      lines.push(`    Functions: ${funcs}`);
    }
  }

  return lines.join('\n');
}
