#!/usr/bin/env node

/**
 * Smart AI Test Suit - CLI Entry Point
 * Main CLI interface using Commander.js
 */

import { Command } from 'commander';
import { ExitCode, type GenerationOptions, type CodebaseOptions, type ProviderType, type TestFramework, type OutputFormat } from './types.js';
import { formatError, getExitCode, InvalidArgsError } from './utils/errors.js';
import { exists, isDirectory, isFile, isSourceFile, toRelativePath } from './utils/file.js';
import { ProviderFactory, getProvider } from './providers/index.js';
import { createOrchestrator, createAgentContext } from './agents/orchestrator.js';
import {
  createCodebaseScanner,
  formatScanResult,
  formatBatchResult,
} from './services/codebase-scanner.js';
import { createProgressReporter } from './ui/progress-reporter.js';

// =============================================================================
// Version and Metadata
// =============================================================================

const VERSION = '2.0.0';
const DESCRIPTION = 'AI-powered test generation CLI with multi-provider LLM support and self-healing capabilities';

// =============================================================================
// Environment Loading
// =============================================================================

interface EnvConfig {
  provider?: ProviderType;
  groqApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  maxRetries: number;
  timeout: number;
}

function loadEnvConfig(): EnvConfig {
  return {
    provider: process.env.SMART_TEST_PROVIDER as ProviderType | undefined,
    groqApiKey: process.env.GROQ_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'codellama',
    maxRetries: parseInt(process.env.SMART_TEST_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.SMART_TEST_TIMEOUT || '120', 10) * 1000,
  };
}

// =============================================================================
// Option Parsing Helpers
// =============================================================================

function parseProvider(value: string): ProviderType {
  const valid: ProviderType[] = ['ollama', 'groq', 'openai', 'anthropic'];
  if (!valid.includes(value as ProviderType)) {
    throw new InvalidArgsError(
      `Invalid provider: ${value}. Valid options: ${valid.join(', ')}`
    );
  }
  return value as ProviderType;
}

function parseFramework(value: string): TestFramework {
  const valid: TestFramework[] = ['vitest', 'jest', 'mocha'];
  if (!valid.includes(value as TestFramework)) {
    throw new InvalidArgsError(
      `Invalid framework: ${value}. Valid options: ${valid.join(', ')}`
    );
  }
  return value as TestFramework;
}

function parsePositiveInt(value: string, name: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new InvalidArgsError(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseOutputFormat(value: string): OutputFormat {
  const valid: OutputFormat[] = ['file', 'stdout', 'json'];
  if (!valid.includes(value as OutputFormat)) {
    throw new InvalidArgsError(
      `Invalid format: ${value}. Valid options: ${valid.join(', ')}`
    );
  }
  return value as OutputFormat;
}

// =============================================================================
// Command Handlers
// =============================================================================

async function handleUnitCommand(
  file: string,
  options: GenerationOptions
): Promise<void> {
  // Create progress reporter based on format
  const reporter = createProgressReporter({
    verbose: options.verbose,
    silent: options.format === 'stdout',
    format: options.format,
  });

  // Validate file exists and is a source file
  if (!exists(file)) {
    throw new InvalidArgsError(`File not found: ${file}`);
  }

  if (!(await isFile(file))) {
    throw new InvalidArgsError(`Not a file: ${file}`);
  }

  if (!isSourceFile(file)) {
    throw new InvalidArgsError(
      `Not a source file: ${file}. Expected .ts, .tsx, .js, or .jsx`
    );
  }

  // Handle prompt-only mode (no LLM call)
  if (options.promptOnly) {
    // TODO: Output constructed prompt using prompt builder
    if (options.format !== 'stdout') {
      console.log(`[Smart Test] Prompt-only mode for: ${file}`);
      console.log('[Smart Test] Prompt output not yet implemented.');
    }
    return;
  }

  // Initialize provider
  const provider = await getProvider({
    provider: options.provider,
    model: options.model,
    timeout: options.timeout,
  });

  reporter.verbose(`Configuration: ${JSON.stringify(options, null, 2)}`);
  reporter.verbose(`Provider: ${provider.name}`);

  if (options.format !== 'stdout') {
    console.log(`[Smart Test] Using provider: ${provider.name}`);
    console.log(`[Smart Test] Generating tests for: ${file}`);
  }

  // Create orchestrator with progress callback
  const orchestrator = createOrchestrator({
    onProgress: (update) => {
      if (options.format !== 'stdout') {
        reporter.report(update);
      }
    },
  });

  // Create agent context
  const context = createAgentContext(provider, options, file);

  // Execute the pipeline
  const result = await orchestrator.execute({ file, options }, context);

  if (!result.success) {
    throw new Error(result.error?.message || 'Test generation failed');
  }

  // Handle output based on format
  if (options.format === 'stdout') {
    // Output only the test code for piping
    console.log(result.data!.testCode);
  } else if (options.format === 'json') {
    // Output JSON for programmatic consumption
    console.log(JSON.stringify({
      sourceFile: file,
      testFile: result.data!.testFile,
      testCount: result.data!.testCount,
      edgeCases: result.data!.edgeCases,
      validationPassed: result.data!.validationPassed,
      healingAttempts: result.data!.healingAttempts,
      metrics: result.data!.metrics,
    }, null, 2));
  } else {
    // Normal file output mode
    console.log('');
    console.log(`[Smart Test] Tests written to: ${result.data!.testFile}`);
    console.log(`[Smart Test] Generated ${result.data!.testCount} test(s)`);
    console.log(`[Smart Test] Edge cases covered: ${result.data!.edgeCases.join(', ') || 'none'}`);

    if (result.data!.healingAttempts) {
      console.log(`[Smart Test] Self-healing attempts: ${result.data!.healingAttempts}`);
    }

    console.log(`[Smart Test] Duration: ${result.data!.metrics.totalDuration}ms`);
  }
}

async function handleCodebaseCommand(
  dir: string,
  options: CodebaseOptions
): Promise<void> {
  // Validate directory exists
  if (!exists(dir)) {
    throw new InvalidArgsError(`Directory not found: ${dir}`);
  }

  if (!(await isDirectory(dir))) {
    throw new InvalidArgsError(`Not a directory: ${dir}`);
  }

  // Initialize provider (validates availability)
  const provider = await getProvider({
    provider: options.provider,
    model: options.model,
    timeout: options.timeout,
  });

  if (options.verbose) {
    console.error('Configuration:', JSON.stringify(options, null, 2));
    console.error(`Provider: ${provider.name}`);
  }

  console.log(`[Smart Test] Using provider: ${provider.name}`);
  console.log(`[Smart Test] Analyzing codebase: ${dir}`);
  console.log('');

  // Create codebase scanner with progress callback
  const scanner = createCodebaseScanner({
    onProgress: (update) => {
      if (options.verbose) {
        const progress = update.current && update.total
          ? ` [${update.current}/${update.total}]`
          : '';
        console.log(`[${update.phase}]${progress} ${update.message}`);
      }
    },
  });

  // Scan and analyze the codebase
  const { scan, graph, processingOrder } = await scanner.analyze(dir, {
    include: options.include,
    exclude: options.exclude,
  });

  // Display scan results
  console.log(formatScanResult(scan, options.verbose));

  // Show dependency graph info if verbose
  if (options.verbose && graph.circularDependencies.length > 0) {
    console.log('Circular Dependencies Detected:');
    for (const cycle of graph.circularDependencies) {
      console.log(`  - ${cycle.map(f => toRelativePath(f)).join(' -> ')}`);
    }
    console.log('');
  }

  // If no untested files, we're done
  if (scan.untestedFiles.length === 0) {
    console.log('[Smart Test] All source files have tests. Nothing to generate.');
    return;
  }

  console.log(`[Smart Test] Processing ${processingOrder.length} files in dependency order...`);
  console.log('');

  // Process files in batch
  const result = await scanner.process(
    processingOrder,
    async (file, index, total) => {
      // Progress update
      const relativePath = toRelativePath(file);
      console.log(`[${index + 1}/${total}] Processing ${relativePath}...`);

      // TODO: Integrate with orchestrator when available
      // For now, return a placeholder result
      return {
        sourceFile: file,
        testFile: file.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
        success: false,
        testCount: 0,
        edgeCases: [],
        validationPassed: false,
        error: 'Test generation not yet integrated. See Epic 3 for orchestrator integration.',
      };
    },
    {
      parallel: options.parallel,
      stopOnError: false,
      onProgress: (update) => {
        if (update.phase === 'complete') {
          console.log('');
        }
      },
    }
  );

  // Display batch results
  console.log(formatBatchResult(result, options.verbose));

  // Exit with appropriate code
  if (result.failedCount > 0 && result.successCount === 0) {
    process.exit(ExitCode.GENERATION_FAILED);
  }
}

async function handleProvidersCommand(): Promise<void> {
  console.log('[Smart Test] Checking available providers...\n');

  const statuses = await ProviderFactory.checkAllProviders();

  for (const status of statuses) {
    const icon = status.available ? '✓' : '✗';
    const availText = status.available ? 'available' : 'not available';
    const modelText = status.model ? ` (model: ${status.model})` : '';
    const errorText = status.error ? ` - ${status.error}` : '';

    console.log(`  ${icon} ${status.name}: ${availText}${modelText}${errorText}`);
  }

  const firstAvailable = await ProviderFactory.getFirstAvailable();
  if (firstAvailable) {
    console.log(`\nDefault provider (auto-detect): ${firstAvailable}`);
  } else {
    console.log('\nNo providers available. Set an API key or start Ollama.');
  }
}

// =============================================================================
// CLI Program Definition
// =============================================================================

function createProgram(): Command {
  const envConfig = loadEnvConfig();
  const program = new Command();

  program
    .name('smart-test')
    .description(DESCRIPTION)
    .version(VERSION, '-v, --version', 'Display version number');

  // Common options shared between commands
  const addCommonOptions = (cmd: Command): Command => {
    return cmd
      .option(
        '-p, --provider <provider>',
        'LLM provider (ollama, groq, openai, anthropic)',
        parseProvider,
        envConfig.provider
      )
      .option('-m, --model <model>', 'Model name to use')
      .option(
        '-f, --framework <framework>',
        'Test framework (vitest, jest, mocha)',
        parseFramework,
        'vitest' as TestFramework
      )
      .option('-o, --output <dir>', 'Output directory for test files')
      .option('-r, --run', 'Run tests after generation', false)
      .option('--fix', 'Auto-fix failing tests (requires --run)', false)
      .option(
        '--max-retries <n>',
        'Maximum fix attempts',
        (v) => parsePositiveInt(v, 'max-retries'),
        envConfig.maxRetries
      )
      .option('--timeout <seconds>', 'Operation timeout in seconds', (v) =>
        parsePositiveInt(v, 'timeout') * 1000
      )
      .option('--verbose', 'Enable verbose output', false)
      .option('--prompt-only', 'Output constructed prompt without LLM call', false)
      .option(
        '--format <format>',
        'Output format (file, stdout, json)',
        parseOutputFormat,
        'file' as OutputFormat
      );
  };

  // Unit test command
  addCommonOptions(
    program
      .command('unit <file>')
      .description('Generate unit tests for a single source file')
  ).action(async (file: string, cmdOptions: Record<string, unknown>) => {
    const options: GenerationOptions = {
      framework: cmdOptions.framework as TestFramework,
      provider: cmdOptions.provider as ProviderType | undefined,
      model: cmdOptions.model as string | undefined,
      outputDir: cmdOptions.output as string | undefined,
      run: cmdOptions.run as boolean,
      fix: cmdOptions.fix as boolean,
      maxRetries: cmdOptions.maxRetries as number,
      verbose: cmdOptions.verbose as boolean,
      timeout: (cmdOptions.timeout as number) || envConfig.timeout,
      promptOnly: cmdOptions.promptOnly as boolean,
      format: cmdOptions.format as OutputFormat,
    };

    // Validate --fix requires --run
    if (options.fix && !options.run) {
      throw new InvalidArgsError('--fix requires --run flag');
    }

    // Validate --prompt-only conflicts
    if (options.promptOnly && options.run) {
      throw new InvalidArgsError('--prompt-only cannot be used with --run');
    }

    await handleUnitCommand(file, options);
  });

  // Codebase command
  addCommonOptions(
    program
      .command('codebase <dir>')
      .description('Generate tests for entire codebase')
      .option(
        '-i, --include <patterns>',
        'Include file patterns (comma-separated)',
        (v) => v.split(',').map((s) => s.trim())
      )
      .option(
        '-e, --exclude <patterns>',
        'Exclude file patterns (comma-separated)',
        (v) => v.split(',').map((s) => s.trim())
      )
      .option(
        '--parallel <n>',
        'Number of parallel workers',
        (v) => parsePositiveInt(v, 'parallel'),
        1
      )
  ).action(async (dir: string, cmdOptions: Record<string, unknown>) => {
    const options: CodebaseOptions = {
      framework: cmdOptions.framework as TestFramework,
      provider: cmdOptions.provider as ProviderType | undefined,
      model: cmdOptions.model as string | undefined,
      outputDir: cmdOptions.output as string | undefined,
      run: cmdOptions.run as boolean,
      fix: cmdOptions.fix as boolean,
      maxRetries: cmdOptions.maxRetries as number,
      verbose: cmdOptions.verbose as boolean,
      timeout: (cmdOptions.timeout as number) || envConfig.timeout,
      promptOnly: cmdOptions.promptOnly as boolean,
      format: cmdOptions.format as OutputFormat,
      include: cmdOptions.include as string[] | undefined,
      exclude: cmdOptions.exclude as string[] | undefined,
      parallel: cmdOptions.parallel as number | undefined,
    };

    // Validate --fix requires --run
    if (options.fix && !options.run) {
      throw new InvalidArgsError('--fix requires --run flag');
    }

    // Validate --prompt-only conflicts
    if (options.promptOnly && options.run) {
      throw new InvalidArgsError('--prompt-only cannot be used with --run');
    }

    await handleCodebaseCommand(dir, options);
  });

  // Providers command - list available providers
  program
    .command('providers')
    .description('List available LLM providers and their status')
    .action(async () => {
      await handleProvidersCommand();
    });

  // Help text customization
  program.addHelpText(
    'after',
    `
Examples:
  $ smart-test unit src/utils/file.ts
  $ smart-test unit src/api.ts --run --fix
  $ smart-test unit src/index.ts -p groq -m llama-3.1-70b-versatile
  $ smart-test unit src/api.ts --format stdout > tests.ts
  $ smart-test unit src/api.ts --prompt-only
  $ smart-test unit src/api.ts --verbose
  $ smart-test codebase src/ --exclude "**/*.config.ts"
  $ smart-test codebase . --run --fix --max-retries 5
  $ smart-test providers

Environment Variables:
  SMART_TEST_PROVIDER    Default LLM provider
  GROQ_API_KEY           Groq API key
  OPENAI_API_KEY         OpenAI API key
  ANTHROPIC_API_KEY      Anthropic API key
  OLLAMA_HOST            Ollama server URL (default: http://localhost:11434)
  OLLAMA_MODEL           Ollama model name (default: codellama)
  SMART_TEST_MAX_RETRIES Default max retries (default: 3)
  SMART_TEST_TIMEOUT     Default timeout in seconds (default: 120)
`
  );

  return program;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const verbose = process.argv.includes('--verbose') || process.argv.includes('-V');
    console.error(formatError(error, verbose));
    process.exit(getExitCode(error));
  }
}

// Run if this is the main module
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(ExitCode.GENERATION_FAILED);
});
