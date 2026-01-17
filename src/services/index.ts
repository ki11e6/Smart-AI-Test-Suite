/**
 * Smart AI Test Suit - Services Module
 * Exports all services for the application.
 */

// Prompt Builder Service
export {
  buildTestGenerationPrompt,
  buildFixTestPrompt,
  buildAnalyzeFailurePrompt,
  buildInlineTestPrompt,
  type TestGenerationPromptInput,
  type FixTestPromptInput,
  type AnalyzeFailurePromptInput,
} from './prompt-builder.js';

// Dependency Resolver Service
export {
  DependencyResolver,
  getDependencyResolver,
  createDependencyResolver,
  type DependencyResolutionResult,
} from './dependency-resolver.js';

// Test Generation Service
export {
  // Framework Detection
  detectFramework,
  findPackageJson,
  // Mock Generation
  generateMockInstructions,
  formatMockInstructions,
  // Edge Case Analysis
  analyzeEdgeCases,
  formatEdgeCaseInstructions,
  getRequiredEdgeCaseCount,
  // Combined Analysis
  analyzeForTestGeneration,
  // Types
  type PackageJson,
  type MockInstruction,
  type EdgeCase,
  type EdgeCaseCategory,
  type TestGenerationAnalysis,
} from './test-generation.js';

// Quality Assurance Service
export {
  QualityAssuranceService,
  getQualityAssuranceService,
  createQualityAssuranceService,
  type QualityReport,
  type ValidationOptions,
} from './quality-assurance.js';

// Test Runner Service
export {
  // Test Execution
  runTests,
  parseTestOutput,
  getTestRunner,
  createTestRunner,
  // Fix History
  createFixHistory,
  recordAttempt,
  getPreviousFixes,
  hasRetriesRemaining,
  getRemainingRetries,
  // Progress Display
  formatHealingProgress,
  // Types
  type TestRunner,
  type TestRunnerOptions,
  type FixHistory,
  type HealingProgressOptions,
} from './test-runner.js';

// Codebase Scanner Service
export {
  // Scanning
  scanDirectory,
  findUntestedFiles,
  // Dependency Graph
  buildCodebaseGraph,
  // Batch Processing
  processBatch,
  // Formatting
  formatScanResult,
  formatBatchResult,
  // Class
  CodebaseScanner,
  getCodebaseScanner,
  createCodebaseScanner,
  // Types
  type ScanOptions,
  type ScanResult,
  type CodebaseGraph,
  type BatchProcessOptions,
  type FileProcessor,
  type CodebaseScannerOptions,
} from './codebase-scanner.js';
