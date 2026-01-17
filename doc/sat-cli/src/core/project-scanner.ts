import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { analyzeCode, CodeAnalysis } from './analyzer';

export interface FileInfo {
  path: string;
  relativePath: string;
  exports: string[];
  classes: string[];
  complexity: 'low' | 'medium' | 'high';
  lines: number;
}

export interface ProjectContext {
  projectName: string;
  projectPath: string;
  stack: string[];
  patterns: {
    componentStyle?: string;
    stateManagement?: string;
    apiStyle?: string;
    architecture?: string;
  };
  testingSetup: {
    framework: string;
    hasExistingTests: boolean;
    testDir: string;
  };
  structure: {
    sourceDir: string;
    directories: string[];
    totalFiles: number;
    totalLines: number;
  };
  files: FileInfo[];
  dependencies: string[];
  devDependencies: string[];
  scannedAt: string;
  /** AI-generated recommendations for the project (optional) */
  aiRecommendations?: string[];
}

/**
 * Scan a project and build comprehensive context
 */
export async function scanProject(projectPath: string): Promise<ProjectContext> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  let packageJson: any = {};

  // Read package.json
  if (await fs.pathExists(packageJsonPath)) {
    packageJson = await fs.readJson(packageJsonPath);
  }

  // Detect stack from dependencies
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const stack = detectStack(deps);

  // Detect testing framework
  const testingSetup = detectTestingSetup(deps, projectPath);

  // Find all source files
  const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectPath,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__mocks__/**',
    ],
  });

  // Analyze files (limit to first 50 for performance)
  const filesToAnalyze = sourceFiles.slice(0, 50);
  const fileInfos: FileInfo[] = [];
  let totalLines = 0;

  for (const file of filesToAnalyze) {
    const fullPath = path.join(projectPath, file);
    const analysis = await analyzeCode(fullPath);

    if (analysis) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      totalLines += lines;

      fileInfos.push({
        path: fullPath,
        relativePath: file,
        exports: analysis.functions.filter(f => f.isExported).map(f => f.name),
        classes: analysis.classes.map(c => c.name),
        complexity: calculateComplexity(analysis, lines),
        lines,
      });
    }
  }

  // Get unique directories
  const directories = [...new Set(sourceFiles.map(f => path.dirname(f)))].sort();

  // Check for existing tests
  const existingTests = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: projectPath,
    ignore: ['node_modules/**'],
  });

  return {
    projectName: packageJson.name || path.basename(projectPath),
    projectPath,
    stack,
    patterns: detectPatterns(deps, sourceFiles),
    testingSetup: {
      ...testingSetup,
      hasExistingTests: existingTests.length > 0,
    },
    structure: {
      sourceDir: detectSourceDir(directories),
      directories,
      totalFiles: sourceFiles.length,
      totalLines,
    },
    files: fileInfos,
    dependencies: Object.keys(packageJson.dependencies || {}),
    devDependencies: Object.keys(packageJson.devDependencies || {}),
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Detect technology stack from dependencies
 */
function detectStack(deps: Record<string, string>): string[] {
  const stack: string[] = ['node'];

  // Languages
  if (deps.typescript) stack.push('typescript');

  // Frontend frameworks
  if (deps.react) stack.push('react');
  if (deps.vue) stack.push('vue');
  if (deps.angular || deps['@angular/core']) stack.push('angular');
  if (deps.svelte) stack.push('svelte');
  if (deps.next) stack.push('nextjs');
  if (deps.nuxt) stack.push('nuxt');

  // Backend frameworks
  if (deps.express) stack.push('express');
  if (deps.fastify) stack.push('fastify');
  if (deps.koa) stack.push('koa');
  if (deps.nestjs || deps['@nestjs/core']) stack.push('nestjs');

  // Testing
  if (deps.jest) stack.push('jest');
  if (deps.vitest) stack.push('vitest');
  if (deps.mocha) stack.push('mocha');

  // State management
  if (deps.redux || deps['@reduxjs/toolkit']) stack.push('redux');
  if (deps.zustand) stack.push('zustand');
  if (deps.mobx) stack.push('mobx');
  if (deps.recoil) stack.push('recoil');

  // Databases
  if (deps.prisma || deps['@prisma/client']) stack.push('prisma');
  if (deps.mongoose) stack.push('mongodb');
  if (deps.pg || deps.postgres) stack.push('postgresql');

  return stack;
}

/**
 * Detect testing framework setup
 */
function detectTestingSetup(
  deps: Record<string, string>,
  projectPath: string
): { framework: string; testDir: string } {
  let framework = 'jest'; // default
  let testDir = '__tests__';

  if (deps.vitest) {
    framework = 'vitest';
    testDir = 'tests';
  } else if (deps.mocha) {
    framework = 'mocha';
    testDir = 'test';
  }

  return { framework, testDir };
}

/**
 * Detect coding patterns from dependencies and file structure
 */
function detectPatterns(
  deps: Record<string, string>,
  files: string[]
): ProjectContext['patterns'] {
  const patterns: ProjectContext['patterns'] = {};

  // Component style
  if (deps.react) {
    patterns.componentStyle = 'functional'; // Modern React default
  }

  // State management
  if (deps.redux || deps['@reduxjs/toolkit']) {
    patterns.stateManagement = 'redux';
  } else if (deps.zustand) {
    patterns.stateManagement = 'zustand';
  } else if (deps.mobx) {
    patterns.stateManagement = 'mobx';
  } else if (deps.react) {
    patterns.stateManagement = 'context'; // Assume React Context if no other
  }

  // API style
  if (deps['@trpc/client'] || deps['@trpc/server']) {
    patterns.apiStyle = 'trpc';
  } else if (deps.graphql || deps['@apollo/client']) {
    patterns.apiStyle = 'graphql';
  } else if (deps.axios || deps['node-fetch']) {
    patterns.apiStyle = 'rest';
  }

  // Architecture
  if (files.some(f => f.includes('/modules/'))) {
    patterns.architecture = 'modular';
  } else if (files.some(f => f.includes('/features/'))) {
    patterns.architecture = 'feature-based';
  } else {
    patterns.architecture = 'standard';
  }

  return patterns;
}

/**
 * Detect primary source directory
 */
function detectSourceDir(directories: string[]): string {
  const srcDir = directories.find(d => d === 'src' || d.startsWith('src/'));
  if (srcDir) return 'src';

  const appDir = directories.find(d => d === 'app' || d.startsWith('app/'));
  if (appDir) return 'app';

  const libDir = directories.find(d => d === 'lib' || d.startsWith('lib/'));
  if (libDir) return 'lib';

  return '.';
}

/**
 * Calculate file complexity based on analysis
 */
function calculateComplexity(
  analysis: CodeAnalysis,
  lines: number
): 'low' | 'medium' | 'high' {
  const totalFunctions = analysis.functions.length;
  const totalMethods = analysis.classes.reduce((sum, c) => sum + c.methods.length, 0);
  const total = totalFunctions + totalMethods;

  if (lines > 300 || total > 15) return 'high';
  if (lines > 100 || total > 5) return 'medium';
  return 'low';
}

/**
 * Save project context to .sat directory
 */
export async function saveProjectContext(
  projectPath: string,
  context: ProjectContext
): Promise<string> {
  const satDir = path.join(projectPath, '.sat');
  await fs.ensureDir(satDir);

  const contextPath = path.join(satDir, 'context.json');
  await fs.writeJson(contextPath, context, { spaces: 2 });

  return contextPath;
}

/**
 * Load project context from .sat directory
 */
export async function loadProjectContext(
  projectPath: string
): Promise<ProjectContext | null> {
  const contextPath = path.join(projectPath, '.sat', 'context.json');

  if (await fs.pathExists(contextPath)) {
    return fs.readJson(contextPath);
  }

  return null;
}

/**
 * Build a summary string for AI context
 */
export function buildContextSummary(context: ProjectContext): string {
  return `
Project: ${context.projectName}
Stack: ${context.stack.join(', ')}
Testing Framework: ${context.testingSetup.framework}
Total Files: ${context.structure.totalFiles}
Has Existing Tests: ${context.testingSetup.hasExistingTests}

Patterns:
- Component Style: ${context.patterns.componentStyle || 'unknown'}
- State Management: ${context.patterns.stateManagement || 'unknown'}
- API Style: ${context.patterns.apiStyle || 'unknown'}
- Architecture: ${context.patterns.architecture || 'unknown'}

Key Dependencies: ${context.dependencies.slice(0, 10).join(', ')}
`.trim();
}
