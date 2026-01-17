/**
 * Smart AI Test Suit - Shared Type Definitions
 * Central type definitions for the entire application.
 */

// =============================================================================
// Exit Codes
// =============================================================================

export const ExitCode = {
  SUCCESS: 0,
  INVALID_ARGS: 1,
  FILE_NOT_FOUND: 2,
  PROVIDER_ERROR: 3,
  GENERATION_FAILED: 4,
  VALIDATION_FAILED: 5,
  TEST_RUN_FAILED: 6,
  SELF_HEAL_EXHAUSTED: 7,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

// =============================================================================
// Framework & Provider Types
// =============================================================================

export type TestFramework = 'vitest' | 'jest' | 'mocha';

export type ProviderType = 'ollama' | 'groq' | 'openai' | 'anthropic';

// =============================================================================
// LLM Provider Types
// =============================================================================

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ProviderConfig {
  provider: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

// =============================================================================
// Dependency Resolution Types
// =============================================================================

export interface ImportInfo {
  path: string;
  specifiers: ImportSpecifier[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ImportSpecifier {
  name: string;
  alias?: string;
  isType: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  isType: boolean;
  kind: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'enum';
}

export interface TypeInfo {
  name: string;
  definition: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
}

export interface FunctionSignature {
  name: string;
  params: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface DependencyInfo {
  path: string;
  isExternal: boolean;
  exports: ExportInfo[];
  types: TypeInfo[];
  functionSignatures: FunctionSignature[];
}

export type DependencyGraph = Map<string, string[]>;

// =============================================================================
// Agent System Types
// =============================================================================

export interface AgentContext {
  sourceFile: string;
  sourceCode: string;
  dependencies: DependencyInfo[];
  framework: TestFramework;
  provider: LLMProvider;
  options: GenerationOptions;
}

export interface AgentMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  tokensUsed?: number;
}

export interface AgentError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metrics?: AgentMetrics;
}

export interface Agent<TInput, TOutput> {
  readonly name: string;
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
}

// =============================================================================
// Analyzer Agent Types
// =============================================================================

export interface AnalyzerInput {
  filePath: string;
}

export interface AnalyzerOutput {
  sourceCode: string;
  language: 'typescript' | 'javascript';
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: DependencyInfo[];
  dependencyGraph?: DependencyGraph;
  circularDependencies?: string[][];
}

// =============================================================================
// Writer Agent Types
// =============================================================================

export interface WriterInput {
  sourceCode: string;
  dependencies: DependencyInfo[];
  framework: TestFramework;
}

export interface MockInfo {
  modulePath: string;
  functions: string[];
  isExternal: boolean;
}

export interface WriterOutput {
  testCode: string;
  testCount: number;
  edgeCases: string[];
  mocks: MockInfo[];
}

// =============================================================================
// Validator Agent Types
// =============================================================================

export interface ValidatorInput {
  testCode: string;
  sourceFile: string;
  dependencies: DependencyInfo[];
}

export interface LintError {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

export interface ImportError {
  importPath: string;
  message: string;
  suggestion?: string;
}

export interface MockIssue {
  mockPath: string;
  functionName: string;
  issue: 'missing' | 'type_mismatch' | 'not_reset';
  suggestion?: string;
}

export interface ValidationIssue {
  type: 'lint' | 'import' | 'mock' | 'type';
  message: string;
  line?: number;
  autoFixed: boolean;
}

export interface ValidatorOutput {
  isValid: boolean;
  lintErrors: LintError[];
  importErrors: ImportError[];
  mockIssues: MockIssue[];
  fixedCode?: string;
}

// =============================================================================
// Fixer Agent Types
// =============================================================================

export interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  expected?: string;
  actual?: string;
  line?: number;
}

export interface TestRunOutput {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
  duration: number;
  rawOutput: string;
}

export interface FixerInput {
  testCode: string;
  testOutput: TestRunOutput;
  sourceCode: string;
  attempt: number;
  previousFixes?: FixDescription[];
}

export interface FixDescription {
  testName: string;
  issue: string;
  fix: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FixerOutput {
  fixedCode: string;
  fixesApplied: FixDescription[];
}

// =============================================================================
// Self-Healing Types
// =============================================================================

export interface HealingContext {
  testCode: string;
  sourceFile: string;
  sourceCode: string;
  dependencies: DependencyInfo[];
  maxRetries: number;
}

export interface HealingAttempt {
  attempt: number;
  failures?: TestFailure[];
  fixes?: FixDescription[];
  error?: AgentError;
}

export interface HealingResult {
  success: boolean;
  finalCode: string;
  attempts: number;
  history: HealingAttempt[];
  remainingFailures?: TestFailure[];
}

// =============================================================================
// CLI Types
// =============================================================================

export type OutputFormat = 'file' | 'stdout' | 'json';

export interface GenerationOptions {
  framework: TestFramework;
  provider?: ProviderType;
  model?: string;
  outputDir?: string;
  run: boolean;
  fix: boolean;
  maxRetries: number;
  verbose: boolean;
  timeout: number;
  promptOnly?: boolean;
  format?: OutputFormat;
}

export interface CodebaseOptions extends GenerationOptions {
  include?: string[];
  exclude?: string[];
  parallel?: number;
}

export interface CLIContext {
  cwd: string;
  options: GenerationOptions;
  provider: LLMProvider;
}

// =============================================================================
// Test Result Types
// =============================================================================

export interface TestGenerationResult {
  sourceFile: string;
  testFile: string;
  success: boolean;
  testCount: number;
  edgeCases: string[];
  validationPassed: boolean;
  healingAttempts?: number;
  error?: string;
}

export interface CodebaseResult {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: TestGenerationResult[];
  duration: number;
}

// =============================================================================
// Progress & Reporting Types
// =============================================================================

export type ProgressPhase =
  | 'analyzing'
  | 'generating'
  | 'validating'
  | 'running'
  | 'fixing'
  | 'complete'
  | 'error';

export interface ProgressUpdate {
  phase: ProgressPhase;
  file: string;
  message: string;
  current?: number;
  total?: number;
  attempt?: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

// =============================================================================
// Failure Analysis Types
// =============================================================================

export type FailureErrorType =
  | 'mock'
  | 'type'
  | 'async'
  | 'import'
  | 'test_logic'
  | 'source_logic';

export interface FailureAnalysis {
  rootCause: string;
  errorType: FailureErrorType;
  suggestedFix: string;
  confidence: 'high' | 'medium' | 'low';
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface SmartTestConfig {
  defaultProvider?: ProviderType;
  defaultFramework?: TestFramework;
  maxRetries?: number;
  timeout?: number;
  ollama?: {
    host?: string;
    model?: string;
  };
  outputDir?: string;
  exclude?: string[];
}
