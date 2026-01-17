/**
 * Smart AI Test Suit - Agent Types
 * Type definitions specific to the agent system.
 */

// Re-export common types from main types module
export type {
  Agent,
  AgentContext,
  AgentResult,
  AgentError,
  AgentMetrics,
  AnalyzerInput,
  AnalyzerOutput,
  WriterInput,
  WriterOutput,
  ValidatorInput,
  ValidatorOutput,
  FixerInput,
  FixerOutput,
  MockInfo,
  LintError,
  ImportError,
  MockIssue,
  ValidationIssue,
  TestFailure,
  TestRunOutput,
  FixDescription,
  DependencyInfo,
  ImportInfo,
  ImportSpecifier,
  ExportInfo,
  TypeInfo,
  FunctionSignature,
  ParameterInfo,
  TestFramework,
  GenerationOptions,
  ProgressCallback,
  ProgressUpdate,
  ProgressPhase,
  FailureAnalysis,
  FailureErrorType,
} from '../types.js';

export type { LLMProvider } from '../providers/types.js';

// =============================================================================
// Orchestrator Types
// =============================================================================

export interface OrchestratorInput {
  file: string;
  options: import('../types.js').GenerationOptions;
}

export interface OrchestratorOutput {
  testFile: string;
  testCode: string;
  testCount: number;
  edgeCases: string[];
  validationPassed: boolean;
  healingAttempts?: number;
  metrics: PipelineMetrics;
}

export interface PipelineMetrics {
  totalDuration: number;
  analyzerDuration: number;
  writerDuration: number;
  validatorDuration: number;
  fixerDuration?: number;
  llmCalls: number;
  tokensUsed?: number;
}

// =============================================================================
// Codebase Orchestrator Types
// =============================================================================

export interface CodebaseOrchestratorInput {
  directory: string;
  options: import('../types.js').CodebaseOptions;
}

export interface CodebaseOrchestratorOutput {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: FileResult[];
  metrics: CodebaseMetrics;
}

export interface FileResult {
  sourceFile: string;
  testFile?: string;
  success: boolean;
  error?: string;
  testCount?: number;
}

export interface CodebaseMetrics {
  totalDuration: number;
  filesProcessed: number;
  averageFileTime: number;
  llmCalls: number;
}

// =============================================================================
// Agent Pipeline State
// =============================================================================

export interface PipelineState {
  sourceFile: string;
  sourceCode?: string;
  language?: 'typescript' | 'javascript';
  imports?: import('../types.js').ImportInfo[];
  exports?: import('../types.js').ExportInfo[];
  dependencies?: import('../types.js').DependencyInfo[];
  testCode?: string;
  testCount?: number;
  edgeCases?: string[];
  mocks?: import('../types.js').MockInfo[];
  validationResult?: import('../types.js').ValidatorOutput;
  testRunResult?: import('../types.js').TestRunOutput;
  fixAttempts?: number;
  errors: PipelineError[];
}

export interface PipelineError {
  agent: string;
  phase: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

// =============================================================================
// Base Agent Class Types
// =============================================================================

export interface BaseAgentOptions {
  verbose?: boolean;
  timeout?: number;
}

export interface AgentExecutionContext {
  startTime: number;
  endTime?: number;
  tokensUsed?: number;
}

// =============================================================================
// Prompt Builder Types
// =============================================================================

export interface PromptContext {
  sourceCode: string;
  language: 'typescript' | 'javascript';
  dependencies: import('../types.js').DependencyInfo[];
  framework: import('../types.js').TestFramework;
  additionalInstructions?: string[];
}

export interface FixPromptContext extends PromptContext {
  testCode: string;
  failures: import('../types.js').TestFailure[];
  attempt: number;
  previousFixes?: import('../types.js').FixDescription[];
}

// =============================================================================
// Agent Registry
// =============================================================================

export type AgentName = 'Orchestrator' | 'Analyzer' | 'Writer' | 'Validator' | 'Fixer';

export interface AgentRegistry {
  get<T extends AgentName>(name: T): AgentByName<T>;
  register<T extends AgentName>(name: T, agent: AgentByName<T>): void;
}

// Type mapping for agents
export type AgentByName<T extends AgentName> = T extends 'Analyzer'
  ? import('../types.js').Agent<import('../types.js').AnalyzerInput, import('../types.js').AnalyzerOutput>
  : T extends 'Writer'
    ? import('../types.js').Agent<import('../types.js').WriterInput, import('../types.js').WriterOutput>
    : T extends 'Validator'
      ? import('../types.js').Agent<import('../types.js').ValidatorInput, import('../types.js').ValidatorOutput>
      : T extends 'Fixer'
        ? import('../types.js').Agent<import('../types.js').FixerInput, import('../types.js').FixerOutput>
        : never;
