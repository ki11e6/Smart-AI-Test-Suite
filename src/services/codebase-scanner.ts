/**
 * Smart AI Test Suit - Codebase Scanner Service
 * Scans codebases, builds dependency graphs, and batch processes files.
 */

import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import type {
  DependencyGraph,
  TestGenerationResult,
  CodebaseResult,
  ProgressCallback,
  ProgressPhase,
} from '../types.js';
import {
  findSourceFiles,
  isTestFile,
  getTestFilePath,
  toRelativePath,
  getBasename,
  toAbsolutePath,
} from '../utils/file.js';
import { createDependencyResolver } from './dependency-resolver.js';

// =============================================================================
// Types
// =============================================================================

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
  includeTests?: boolean;
}

export interface ScanResult {
  sourceFiles: string[];
  testFiles: string[];
  untestedFiles: string[];
  totalFiles: number;
  coverage: {
    tested: number;
    untested: number;
    percentage: number;
  };
}

export interface CodebaseGraph {
  files: string[];
  graph: DependencyGraph;
  sortedFiles: string[];
  circularDependencies: string[][];
}

export interface BatchProcessOptions {
  parallel?: number;
  stopOnError?: boolean;
  onProgress?: ProgressCallback;
}

export type FileProcessor = (
  file: string,
  index: number,
  total: number
) => Promise<TestGenerationResult>;

// =============================================================================
// File Scanner
// =============================================================================

/**
 * Scan a directory for source files
 */
export async function scanDirectory(
  dir: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const absoluteDir = toAbsolutePath(dir);

  // Find all source files
  const allFiles = await findSourceFiles(absoluteDir, {
    include: options.include,
    exclude: options.exclude,
  });

  // Separate source and test files
  const sourceFiles: string[] = [];
  const testFiles: string[] = [];

  for (const file of allFiles) {
    if (isTestFile(file)) {
      testFiles.push(file);
    } else {
      sourceFiles.push(file);
    }
  }

  // If we want to include test files, add them to source files
  const filesToProcess = options.includeTests
    ? allFiles
    : sourceFiles;

  // Find untested files
  const untestedFiles = findUntestedFiles(sourceFiles, testFiles);

  const tested = sourceFiles.length - untestedFiles.length;
  const percentage = sourceFiles.length > 0
    ? Math.round((tested / sourceFiles.length) * 100)
    : 100;

  return {
    sourceFiles: filesToProcess,
    testFiles,
    untestedFiles,
    totalFiles: filesToProcess.length,
    coverage: {
      tested,
      untested: untestedFiles.length,
      percentage,
    },
  };
}

/**
 * Find source files that don't have corresponding test files
 */
export function findUntestedFiles(
  sourceFiles: string[],
  testFiles: string[]
): string[] {
  const untestedFiles: string[] = [];

  // Create a set of test file base names for quick lookup
  const testBaseNames = new Set<string>();
  for (const testFile of testFiles) {
    // Get the source file name this test corresponds to
    // e.g., utils.test.ts -> utils
    const baseName = getBasename(testFile)
      .replace(/\.(test|spec)$/, '');
    const dir = dirname(testFile);
    testBaseNames.add(`${dir}/${baseName}`);
  }

  for (const sourceFile of sourceFiles) {
    const baseName = getBasename(sourceFile);
    const dir = dirname(sourceFile);
    const key = `${dir}/${baseName}`;

    // Check if a test file exists for this source file
    if (!testBaseNames.has(key)) {
      // Also check if the test file actually exists on disk
      const possibleTestPaths = [
        getTestFilePath(sourceFile, { suffix: '.test' }),
        getTestFilePath(sourceFile, { suffix: '.spec' }),
        join(dir, '__tests__', `${baseName}.test.ts`),
        join(dir, '__tests__', `${baseName}.spec.ts`),
      ];

      const hasTest = possibleTestPaths.some(p => existsSync(p));
      if (!hasTest) {
        untestedFiles.push(sourceFile);
      }
    }
  }

  return untestedFiles;
}

// =============================================================================
// Dependency Graph Builder
// =============================================================================

/**
 * Build a complete dependency graph for the codebase
 */
export async function buildCodebaseGraph(
  sourceFiles: string[],
  options: { maxDepth?: number } = {}
): Promise<CodebaseGraph> {
  const { maxDepth = 10 } = options;
  const resolver = createDependencyResolver();
  const combinedGraph: DependencyGraph = new Map();
  const allCircularDeps: string[][] = [];

  // Build graph for each source file
  for (const file of sourceFiles) {
    try {
      const fileGraph = await resolver.buildDependencyGraph(file, maxDepth);

      // Merge into combined graph
      for (const [key, deps] of fileGraph) {
        const existing = combinedGraph.get(key) || [];
        const merged = [...new Set([...existing, ...deps])];
        combinedGraph.set(key, merged);
      }

      // Collect circular dependencies
      const circulars = resolver.getCircularDependencies();
      for (const cycle of circulars) {
        // Only add unique cycles
        const cycleKey = cycle.join('->');
        const exists = allCircularDeps.some(c => c.join('->') === cycleKey);
        if (!exists) {
          allCircularDeps.push(cycle);
        }
      }

      // Reset for next file
      resolver.reset();
    } catch {
      // Skip files that can't be analyzed
    }
  }

  // Perform topological sort
  const sortedFiles = resolver.topologicalSort(combinedGraph);

  // Filter to only include files we're processing
  const sourceFileSet = new Set(sourceFiles.map(f => toAbsolutePath(f)));
  const filteredSorted = sortedFiles.filter(f => sourceFileSet.has(f));

  return {
    files: sourceFiles,
    graph: combinedGraph,
    sortedFiles: filteredSorted,
    circularDependencies: allCircularDeps,
  };
}

// =============================================================================
// Batch Processor
// =============================================================================

/**
 * Process files in batch with progress tracking
 */
export async function processBatch(
  files: string[],
  processor: FileProcessor,
  options: BatchProcessOptions = {}
): Promise<CodebaseResult> {
  const {
    parallel = 1,
    stopOnError = false,
    onProgress,
  } = options;

  const startTime = Date.now();
  const results: TestGenerationResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // Report initial progress
  reportProgress(onProgress, 'analyzing', files[0] || '', 'Starting batch processing...', 0, files.length);

  if (parallel > 1) {
    // Parallel processing
    const batches = chunkArray(files, parallel);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchOffset = batchIndex * parallel;

      const batchResults = await Promise.allSettled(
        batch.map((file, i) =>
          processFile(file, batchOffset + i, files.length, processor, onProgress)
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
          if (stopOnError) {
            break;
          }
        }
      }

      if (stopOnError && failedCount > 0) {
        break;
      }
    }
  } else {
    // Sequential processing
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await processFile(file, i, files.length, processor, onProgress);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        results.push({
          sourceFile: file,
          testFile: '',
          success: false,
          testCount: 0,
          edgeCases: [],
          validationPassed: false,
          error: error instanceof Error ? error.message : String(error),
        });

        if (stopOnError) {
          break;
        }
      }
    }
  }

  // Calculate skipped (files not processed due to stopOnError)
  skippedCount = files.length - results.length;

  const duration = Date.now() - startTime;

  // Report completion
  reportProgress(
    onProgress,
    'complete',
    '',
    `Processed ${results.length} files in ${formatDuration(duration)}`,
    files.length,
    files.length
  );

  return {
    totalFiles: files.length,
    successCount,
    failedCount,
    skippedCount,
    results,
    duration,
  };
}

/**
 * Process a single file
 */
async function processFile(
  file: string,
  index: number,
  total: number,
  processor: FileProcessor,
  onProgress?: ProgressCallback
): Promise<TestGenerationResult> {
  const relativePath = toRelativePath(file);

  reportProgress(
    onProgress,
    'generating',
    relativePath,
    `Processing ${relativePath}...`,
    index + 1,
    total
  );

  return processor(file, index, total);
}

// =============================================================================
// Codebase Scanner Class
// =============================================================================

export interface CodebaseScannerOptions {
  onProgress?: ProgressCallback;
}

export class CodebaseScanner {
  private readonly onProgress?: ProgressCallback;

  constructor(options: CodebaseScannerOptions = {}) {
    this.onProgress = options.onProgress;
  }

  /**
   * Scan directory and return scan result
   */
  async scan(dir: string, options: ScanOptions = {}): Promise<ScanResult> {
    this.reportProgress('analyzing', dir, 'Scanning directory...');
    return scanDirectory(dir, options);
  }

  /**
   * Build dependency graph for scanned files
   */
  async buildGraph(files: string[]): Promise<CodebaseGraph> {
    this.reportProgress('analyzing', '', 'Building dependency graph...');
    return buildCodebaseGraph(files);
  }

  /**
   * Get recommended processing order (leaves first)
   */
  async getProcessingOrder(files: string[]): Promise<string[]> {
    const graph = await this.buildGraph(files);
    return graph.sortedFiles;
  }

  /**
   * Process files with a custom processor
   */
  async process(
    files: string[],
    processor: FileProcessor,
    options: BatchProcessOptions = {}
  ): Promise<CodebaseResult> {
    return processBatch(files, processor, {
      ...options,
      onProgress: options.onProgress ?? this.onProgress,
    });
  }

  /**
   * Full codebase analysis: scan, build graph, return ready for processing
   */
  async analyze(
    dir: string,
    options: ScanOptions = {}
  ): Promise<{
    scan: ScanResult;
    graph: CodebaseGraph;
    processingOrder: string[];
  }> {
    const scan = await this.scan(dir, options);
    const graph = await this.buildGraph(scan.untestedFiles);

    return {
      scan,
      graph,
      processingOrder: graph.sortedFiles.length > 0
        ? graph.sortedFiles
        : scan.untestedFiles,
    };
  }

  private reportProgress(
    phase: ProgressPhase,
    file: string,
    message: string,
    current?: number,
    total?: number
  ): void {
    if (this.onProgress) {
      this.onProgress({ phase, file, message, current, total });
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Report progress to callback
 */
function reportProgress(
  callback: ProgressCallback | undefined,
  phase: ProgressPhase,
  file: string,
  message: string,
  current?: number,
  total?: number
): void {
  if (callback) {
    callback({ phase, file, message, current, total });
  }
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Format duration in human readable format
 */
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
// Summary Formatter
// =============================================================================

/**
 * Format scan result for display
 */
export function formatScanResult(result: ScanResult, verbose = false): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Codebase Scan Results');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Total Source Files: ${result.sourceFiles.length}`);
  lines.push(`Test Files Found:   ${result.testFiles.length}`);
  lines.push(`Untested Files:     ${result.untestedFiles.length}`);
  lines.push('');
  lines.push(`Test Coverage: ${result.coverage.percentage}%`);
  lines.push(`  - Tested:   ${result.coverage.tested} files`);
  lines.push(`  - Untested: ${result.coverage.untested} files`);

  if (verbose && result.untestedFiles.length > 0) {
    lines.push('');
    lines.push('Files Without Tests:');
    for (const file of result.untestedFiles.slice(0, 20)) {
      lines.push(`  - ${toRelativePath(file)}`);
    }
    if (result.untestedFiles.length > 20) {
      lines.push(`  ... and ${result.untestedFiles.length - 20} more`);
    }
  }

  lines.push('='.repeat(50));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format batch result for display
 */
export function formatBatchResult(result: CodebaseResult, verbose = false): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Batch Processing Results');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Total Files:  ${result.totalFiles}`);
  lines.push(`Successful:   ${result.successCount}`);
  lines.push(`Failed:       ${result.failedCount}`);
  lines.push(`Skipped:      ${result.skippedCount}`);
  lines.push(`Duration:     ${formatDuration(result.duration)}`);

  if (verbose) {
    const failures = result.results.filter(r => !r.success);
    if (failures.length > 0) {
      lines.push('');
      lines.push('Failed Files:');
      for (const failure of failures) {
        lines.push(`  - ${toRelativePath(failure.sourceFile)}`);
        if (failure.error) {
          lines.push(`    Error: ${failure.error}`);
        }
      }
    }
  }

  // Summary stats
  const totalTests = result.results.reduce((sum, r) => sum + r.testCount, 0);
  const totalEdgeCases = result.results.reduce((sum, r) => sum + r.edgeCases.length, 0);

  lines.push('');
  lines.push('Generated:');
  lines.push(`  - Tests:      ${totalTests}`);
  lines.push(`  - Edge Cases: ${totalEdgeCases}`);

  lines.push('='.repeat(50));
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Factory Functions
// =============================================================================

let scannerInstance: CodebaseScanner | null = null;

/**
 * Get shared codebase scanner instance
 */
export function getCodebaseScanner(
  options?: CodebaseScannerOptions
): CodebaseScanner {
  if (!scannerInstance) {
    scannerInstance = new CodebaseScanner(options);
  }
  return scannerInstance;
}

/**
 * Create a new codebase scanner instance
 */
export function createCodebaseScanner(
  options?: CodebaseScannerOptions
): CodebaseScanner {
  return new CodebaseScanner(options);
}
