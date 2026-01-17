/**
 * Smart AI Test Suit - Quality Assurance Service
 * Provides comprehensive validation for generated test code.
 */

import * as ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type {
  LintError,
  ImportError,
  MockIssue,
  DependencyInfo,
  TestFramework,
} from '../types.js';

// =============================================================================
// Quality Report Types
// =============================================================================

export interface QualityReport {
  isValid: boolean;
  score: number; // 0-100
  lintErrors: LintError[];
  importErrors: ImportError[];
  mockIssues: MockIssue[];
  suggestions: string[];
  fixedCode?: string;
  fixesApplied: string[];
}

export interface ValidationOptions {
  sourceFile: string;
  dependencies: DependencyInfo[];
  framework?: TestFramework;
  autoFix?: boolean;
  strictMode?: boolean;
}

// =============================================================================
// Quality Assurance Service
// =============================================================================

export class QualityAssuranceService {
  private readonly testingUtilities = new Set([
    'vitest',
    'jest',
    '@jest/globals',
    'mocha',
    'chai',
    'sinon',
    'expect',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
  ]);

  /**
   * Perform comprehensive quality validation
   */
  async validate(testCode: string, options: ValidationOptions): Promise<QualityReport> {
    const { sourceFile, dependencies, framework = 'vitest', autoFix = true } = options;

    // Run all validations
    const lintErrors = this.runLintCheck(testCode);
    const importErrors = this.validateImports(testCode, sourceFile);
    const mockIssues = this.validateMocks(testCode, dependencies, framework);

    // Generate suggestions
    const suggestions = this.generateSuggestions(lintErrors, importErrors, mockIssues);

    // Attempt auto-fixes if enabled
    let fixedCode: string | undefined;
    const fixesApplied: string[] = [];

    if (autoFix) {
      const fixResult = this.autoFix(testCode, {
        importErrors,
        mockIssues,
        framework,
        dependencies,
      });
      fixedCode = fixResult.code !== testCode ? fixResult.code : undefined;
      fixesApplied.push(...fixResult.fixes);
    }

    // Calculate quality score
    const score = this.calculateScore(lintErrors, importErrors, mockIssues);

    // Determine overall validity
    const isValid =
      !lintErrors.some((e) => e.severity === 'error') &&
      importErrors.length === 0 &&
      !mockIssues.some((m) => m.issue === 'missing');

    return {
      isValid,
      score,
      lintErrors,
      importErrors,
      mockIssues,
      suggestions,
      fixedCode,
      fixesApplied,
    };
  }

  // =============================================================================
  // Story 6.1: ESLint/TypeScript Integration
  // =============================================================================

  /**
   * Run TypeScript-based lint checking
   */
  private runLintCheck(testCode: string): LintError[] {
    const errors: LintError[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        testCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );

      // Compiler options for checking
      const compilerOptions: ts.CompilerOptions = {
        noEmit: true,
        strict: false,
        skipLibCheck: true,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        module: ts.ModuleKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      };

      // Create compiler host
      const host = ts.createCompilerHost(compilerOptions);
      const originalGetSourceFile = host.getSourceFile;
      host.getSourceFile = (fileName, languageVersion) => {
        if (fileName === 'test.ts') {
          return sourceFile;
        }
        return originalGetSourceFile.call(host, fileName, languageVersion);
      };

      const program = ts.createProgram(['test.ts'], compilerOptions, host);

      // Get syntactic diagnostics
      const syntacticDiagnostics = program.getSyntacticDiagnostics(sourceFile);
      for (const diagnostic of syntacticDiagnostics) {
        errors.push(this.diagnosticToLintError(diagnostic, sourceFile));
      }

      // Also run custom lint rules
      errors.push(...this.runCustomLintRules(sourceFile, testCode));
    } catch {
      // TypeScript check failed, don't block
    }

    return errors;
  }

  /**
   * Convert TypeScript diagnostic to LintError
   */
  private diagnosticToLintError(
    diagnostic: ts.Diagnostic,
    _sourceFile: ts.SourceFile
  ): LintError {
    let line = 1;
    let column = 1;

    if (diagnostic.file && diagnostic.start !== undefined) {
      const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      line = pos.line + 1;
      column = pos.character + 1;
    }

    return {
      line,
      column,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ruleId: `TS${diagnostic.code}`,
      severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      fixable: false,
    };
  }

  /**
   * Run custom lint rules specific to test code
   */
  private runCustomLintRules(sourceFile: ts.SourceFile, testCode: string): LintError[] {
    const errors: LintError[] = [];

    // Check for 'any' type usage
    const anyMatches = testCode.matchAll(/:\s*any\b/g);
    for (const match of anyMatches) {
      if (match.index !== undefined) {
        const pos = sourceFile.getLineAndCharacterOfPosition(match.index);
        errors.push({
          line: pos.line + 1,
          column: pos.character + 1,
          message: 'Avoid using "any" type - use specific types for better type safety',
          ruleId: 'no-explicit-any',
          severity: 'warning',
          fixable: false,
        });
      }
    }

    // Check for console.log in tests
    const consoleMatches = testCode.matchAll(/console\.(log|warn|error)\s*\(/g);
    for (const match of consoleMatches) {
      if (match.index !== undefined) {
        const pos = sourceFile.getLineAndCharacterOfPosition(match.index);
        errors.push({
          line: pos.line + 1,
          column: pos.character + 1,
          message: 'Remove console statements from tests',
          ruleId: 'no-console',
          severity: 'warning',
          fixable: true,
        });
      }
    }

    // Check for .only() in tests (should not be committed)
    const onlyMatches = testCode.matchAll(/\.(only|skip)\s*\(/g);
    for (const match of onlyMatches) {
      if (match.index !== undefined) {
        const pos = sourceFile.getLineAndCharacterOfPosition(match.index);
        errors.push({
          line: pos.line + 1,
          column: pos.character + 1,
          message: `Remove .${match[1]}() - tests should not be focused or skipped when committed`,
          ruleId: 'no-focused-tests',
          severity: 'warning',
          fixable: true,
        });
      }
    }

    // Check for missing await on async assertions
    const asyncPatterns = /expect\s*\([^)]*\)\s*\.rejects\./g;
    const asyncMatches = testCode.matchAll(asyncPatterns);
    for (const match of asyncMatches) {
      if (match.index !== undefined) {
        // Check if there's an await before
        const before = testCode.slice(Math.max(0, match.index - 20), match.index);
        if (!before.includes('await')) {
          const pos = sourceFile.getLineAndCharacterOfPosition(match.index);
          errors.push({
            line: pos.line + 1,
            column: pos.character + 1,
            message: 'Add "await" before expect().rejects assertions',
            ruleId: 'require-await',
            severity: 'error',
            fixable: true,
          });
        }
      }
    }

    return errors;
  }

  // =============================================================================
  // Story 6.2: Import Validator
  // =============================================================================

  /**
   * Validate import statements
   */
  private validateImports(testCode: string, sourceFile: string): ImportError[] {
    const errors: ImportError[] = [];

    const sourceFileNode = ts.createSourceFile(
      'test.ts',
      testCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          const importErrors = this.validateSingleImport(importPath, sourceFile);
          errors.push(...importErrors);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFileNode);
    return errors;
  }

  /**
   * Validate a single import path
   */
  private validateSingleImport(importPath: string, sourceFile: string): ImportError[] {
    const errors: ImportError[] = [];
    const isExternal = !importPath.startsWith('.') && !importPath.startsWith('/');

    if (isExternal) {
      // External imports - just check if it's a known package
      // In a real implementation, we'd check node_modules
      return errors;
    }

    // Check ESM extension requirement
    if (!importPath.endsWith('.js') && !importPath.endsWith('.ts') && !importPath.endsWith('.json')) {
      errors.push({
        importPath,
        message: 'Missing .js extension for ESM compatibility',
        suggestion: `${importPath}.js`,
      });
    }

    // Check if path resolves
    const fromDir = dirname(sourceFile);
    const resolved = resolve(fromDir, importPath);

    // Try various extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    const basePath = resolved.replace(/\.[jt]sx?$/, '');
    let found = false;

    for (const ext of extensions) {
      if (existsSync(basePath + ext)) {
        found = true;
        break;
      }
      // Also try index files
      if (existsSync(resolve(basePath, `index${ext}`))) {
        found = true;
        break;
      }
    }

    if (!found && !importPath.endsWith('.js')) {
      // Don't report if we already reported missing .js
      if (!errors.some((e) => e.importPath === importPath)) {
        errors.push({
          importPath,
          message: `Import path does not resolve: ${importPath}`,
        });
      }
    }

    return errors;
  }

  // =============================================================================
  // Story 6.3: Mock Verifier
  // =============================================================================

  /**
   * Validate mock completeness
   */
  private validateMocks(
    testCode: string,
    dependencies: DependencyInfo[],
    framework: TestFramework
  ): MockIssue[] {
    const issues: MockIssue[] = [];

    // Extract all mock calls
    const mockCalls = this.extractMockCalls(testCode);
    const mockSetups = this.extractMockSetups(testCode, framework);

    // Check each dependency
    for (const dep of dependencies) {
      // Skip testing utilities
      if (this.testingUtilities.has(dep.path)) {
        continue;
      }

      const depIssues = this.validateDependencyMock(dep, mockCalls, mockSetups, framework);
      issues.push(...depIssues);
    }

    // Check for mocks without corresponding imports
    for (const mockPath of mockCalls) {
      const hasDep = dependencies.some((d) =>
        d.path === mockPath ||
        d.path.replace(/\.ts$/, '.js') === mockPath ||
        d.path.replace(/\.js$/, '') === mockPath
      );

      if (!hasDep && !this.testingUtilities.has(mockPath)) {
        issues.push({
          mockPath,
          functionName: '*',
          issue: 'not_reset',
          suggestion: `Mock "${mockPath}" doesn't correspond to any import - verify path`,
        });
      }
    }

    return issues;
  }

  /**
   * Extract all mock() calls from test code
   */
  private extractMockCalls(testCode: string): Set<string> {
    const mocks = new Set<string>();
    const pattern = /(?:vi\.mock|jest\.mock)\s*\(\s*['"`]([^'"`]+)['"`]/g;

    for (const match of testCode.matchAll(pattern)) {
      mocks.add(match[1]);
    }

    return mocks;
  }

  /**
   * Extract mock setup calls (mockReturnValue, mockResolvedValue, etc.)
   */
  private extractMockSetups(testCode: string, framework: TestFramework): Map<string, string[]> {
    const setups = new Map<string, string[]>();

    // Match patterns like: mockFunction.mockReturnValue(...) or vi.mocked(func).mockReturnValue(...)
    const mockedPattern = framework === 'vitest'
      ? /(?:vi\.mocked\s*\(\s*(\w+)\s*\)|(\w+))\.mock(?:Return|Resolved|Rejected)Value/g
      : /(?:jest\.mocked\s*\(\s*(\w+)\s*\)|(\w+))\.mock(?:Return|Resolved|Rejected)Value/g;

    for (const match of testCode.matchAll(mockedPattern)) {
      const funcName = match[1] || match[2];
      if (funcName) {
        const existing = setups.get(funcName) || [];
        existing.push('mockValue');
        setups.set(funcName, existing);
      }
    }

    return setups;
  }

  /**
   * Validate a single dependency's mock
   */
  private validateDependencyMock(
    dep: DependencyInfo,
    mockCalls: Set<string>,
    _mockSetups: Map<string, string[]>,
    framework: TestFramework
  ): MockIssue[] {
    const issues: MockIssue[] = [];
    const mockFn = framework === 'vitest' ? 'vi.mock' : 'jest.mock';

    // Normalize paths for comparison
    const normalizedPaths = [
      dep.path,
      dep.path.replace(/\.ts$/, '.js'),
      dep.path.replace(/\.js$/, ''),
    ];

    const isMocked = normalizedPaths.some((p) => mockCalls.has(p));

    if (!isMocked) {
      // External dependencies should typically be mocked
      if (dep.isExternal) {
        issues.push({
          mockPath: dep.path,
          functionName: '*',
          issue: 'missing',
          suggestion: `Add ${mockFn}('${dep.path}') to mock this external dependency`,
        });
      } else if (dep.functionSignatures.length > 0) {
        // Local modules with functions should be mocked
        const jsPath = dep.path.replace(/\.ts$/, '.js');
        issues.push({
          mockPath: dep.path,
          functionName: '*',
          issue: 'missing',
          suggestion: `Add ${mockFn}('${jsPath}') to mock this local module`,
        });
      }
    }

    return issues;
  }

  // =============================================================================
  // Story 6.4: Auto-Fixer
  // =============================================================================

  /**
   * Auto-fix common issues
   */
  private autoFix(
    testCode: string,
    options: {
      importErrors: ImportError[];
      mockIssues: MockIssue[];
      framework: TestFramework;
      dependencies: DependencyInfo[];
    }
  ): { code: string; fixes: string[] } {
    let code = testCode;
    const fixes: string[] = [];

    // Fix 1: Add missing .js extensions
    for (const error of options.importErrors) {
      if (error.suggestion && error.message.includes('.js extension')) {
        const pattern = new RegExp(
          `from\\s*['"]${escapeRegex(error.importPath)}['"]`,
          'g'
        );
        const newCode = code.replace(pattern, `from '${error.suggestion}'`);
        if (newCode !== code) {
          code = newCode;
          fixes.push(`Added .js extension to import: ${error.importPath}`);
        }
      }
    }

    // Fix 2: Add missing mock declarations
    const existingMocks = this.extractMockCalls(code);
    const mockFn = options.framework === 'vitest' ? 'vi.mock' : 'jest.mock';
    const mocksToAdd: string[] = [];

    for (const issue of options.mockIssues) {
      if (issue.issue === 'missing' && !existingMocks.has(issue.mockPath)) {
        const mockPath = issue.mockPath.replace(/\.ts$/, '.js');
        if (!mocksToAdd.includes(mockPath)) {
          mocksToAdd.push(mockPath);
        }
      }
    }

    if (mocksToAdd.length > 0) {
      // Find the best place to insert mocks (after imports, before describe)
      const insertPosition = this.findMockInsertPosition(code);
      const mockStatements = mocksToAdd.map((p) => `${mockFn}('${p}');`).join('\n');

      code = code.slice(0, insertPosition) + '\n' + mockStatements + '\n' + code.slice(insertPosition);
      fixes.push(`Added mock declarations for: ${mocksToAdd.join(', ')}`);
    }

    // Fix 3: Remove console statements
    const consolePattern = /^\s*console\.(log|warn|error)\s*\([^)]*\);?\s*\n?/gm;
    const withoutConsole = code.replace(consolePattern, '');
    if (withoutConsole !== code) {
      code = withoutConsole;
      fixes.push('Removed console statements');
    }

    // Fix 4: Remove .only() and .skip()
    const focusedPattern = /\.(only|skip)\s*\(/g;
    const withoutFocused = code.replace(focusedPattern, '(');
    if (withoutFocused !== code) {
      code = withoutFocused;
      fixes.push('Removed .only() and .skip() from tests');
    }

    return { code, fixes };
  }

  /**
   * Find the best position to insert mock declarations
   */
  private findMockInsertPosition(code: string): number {
    // After last import statement
    const importPattern = /^import\s+.*?;?\s*$/gm;
    let lastImportEnd = 0;

    for (const match of code.matchAll(importPattern)) {
      if (match.index !== undefined) {
        lastImportEnd = match.index + match[0].length;
      }
    }

    if (lastImportEnd > 0) {
      return lastImportEnd;
    }

    // If no imports, insert at the beginning
    return 0;
  }

  // =============================================================================
  // Story 6.5: Quality Report
  // =============================================================================

  /**
   * Generate suggestions based on issues found
   */
  private generateSuggestions(
    lintErrors: LintError[],
    importErrors: ImportError[],
    mockIssues: MockIssue[]
  ): string[] {
    const suggestions: string[] = [];

    // Lint suggestions
    const errorCount = lintErrors.filter((e) => e.severity === 'error').length;
    const warningCount = lintErrors.filter((e) => e.severity === 'warning').length;

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} syntax error(s) before running tests`);
    }
    if (warningCount > 3) {
      suggestions.push('Consider addressing lint warnings to improve code quality');
    }

    // Import suggestions
    const missingExtensions = importErrors.filter((e) => e.message.includes('.js extension'));
    if (missingExtensions.length > 0) {
      suggestions.push('Add .js extensions to all relative imports for ESM compatibility');
    }

    // Mock suggestions
    const missingMocks = mockIssues.filter((m) => m.issue === 'missing');
    if (missingMocks.length > 0) {
      suggestions.push(`Add mock declarations for ${missingMocks.length} unmocked dependencies`);
    }

    return suggestions;
  }

  /**
   * Calculate a quality score (0-100)
   */
  private calculateScore(
    lintErrors: LintError[],
    importErrors: ImportError[],
    mockIssues: MockIssue[]
  ): number {
    let score = 100;

    // Deduct for lint errors
    const syntaxErrors = lintErrors.filter((e) => e.severity === 'error').length;
    const warnings = lintErrors.filter((e) => e.severity === 'warning').length;

    score -= syntaxErrors * 15; // Major deduction for errors
    score -= warnings * 3; // Minor deduction for warnings

    // Deduct for import errors
    score -= importErrors.length * 10;

    // Deduct for mock issues
    const missingMocks = mockIssues.filter((m) => m.issue === 'missing').length;
    const otherMockIssues = mockIssues.length - missingMocks;

    score -= missingMocks * 8;
    score -= otherMockIssues * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Format quality report for display
   */
  formatReport(report: QualityReport): string {
    const lines: string[] = [];

    // Header
    const statusIcon = report.isValid ? '✅' : '⚠️';
    lines.push(`${statusIcon} Quality Score: ${report.score}/100`);
    lines.push('');

    // Lint errors
    if (report.lintErrors.length > 0) {
      lines.push('📋 Lint Issues:');
      for (const error of report.lintErrors.slice(0, 10)) {
        const icon = error.severity === 'error' ? '❌' : '⚡';
        lines.push(`  ${icon} [${error.ruleId}] Line ${error.line}: ${error.message}`);
      }
      if (report.lintErrors.length > 10) {
        lines.push(`  ... and ${report.lintErrors.length - 10} more`);
      }
      lines.push('');
    }

    // Import errors
    if (report.importErrors.length > 0) {
      lines.push('📦 Import Issues:');
      for (const error of report.importErrors) {
        lines.push(`  ❌ [IMPORT] ${error.importPath}: ${error.message}`);
        if (error.suggestion) {
          lines.push(`     💡 Suggestion: ${error.suggestion}`);
        }
      }
      lines.push('');
    }

    // Mock issues
    if (report.mockIssues.length > 0) {
      lines.push('🎭 Mock Issues:');
      for (const issue of report.mockIssues) {
        const icon = issue.issue === 'missing' ? '❌' : '⚠️';
        lines.push(`  ${icon} [MOCK] ${issue.mockPath}: ${issue.issue}`);
        if (issue.suggestion) {
          lines.push(`     💡 ${issue.suggestion}`);
        }
      }
      lines.push('');
    }

    // Fixes applied
    if (report.fixesApplied.length > 0) {
      lines.push('🔧 Auto-fixes Applied:');
      for (const fix of report.fixesApplied) {
        lines.push(`  ✓ ${fix}`);
      }
      lines.push('');
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      lines.push('💡 Suggestions:');
      for (const suggestion of report.suggestions) {
        lines.push(`  • ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Factory Function
// =============================================================================

let qaServiceInstance: QualityAssuranceService | null = null;

/**
 * Get the QA service singleton
 */
export function getQualityAssuranceService(): QualityAssuranceService {
  if (!qaServiceInstance) {
    qaServiceInstance = new QualityAssuranceService();
  }
  return qaServiceInstance;
}

/**
 * Create a new QA service instance
 */
export function createQualityAssuranceService(): QualityAssuranceService {
  return new QualityAssuranceService();
}
