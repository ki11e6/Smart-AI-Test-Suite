/**
 * Smart AI Test Suit - File Utilities
 * File system operations and path utilities.
 */

import { readFile as fsReadFile, writeFile as fsWriteFile, stat, mkdir } from 'node:fs/promises';
import { dirname, extname, basename, join, resolve, relative, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import fg from 'fast-glob';
import { FileNotFoundError, ParseError } from './errors.js';

// =============================================================================
// File Reading & Writing
// =============================================================================

/**
 * Reads a file and returns its contents as a string
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    const absolutePath = toAbsolutePath(filePath);
    return await fsReadFile(absolutePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw error;
  }
}

/**
 * Writes content to a file, creating directories if needed
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const absolutePath = toAbsolutePath(filePath);
  const dir = dirname(absolutePath);

  // Ensure directory exists
  await ensureDir(dir);

  await fsWriteFile(absolutePath, content, 'utf-8');
}

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

// =============================================================================
// File Existence & Type Checks
// =============================================================================

/**
 * Checks if a file or directory exists
 */
export function exists(path: string): boolean {
  return existsSync(toAbsolutePath(path));
}

/**
 * Checks if a path is a file
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await stat(toAbsolutePath(path));
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if a path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(toAbsolutePath(path));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Converts a path to absolute, resolving from CWD if relative
 */
export function toAbsolutePath(filePath: string, basePath?: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return resolve(basePath ?? process.cwd(), filePath);
}

/**
 * Gets the relative path from base to target
 */
export function toRelativePath(targetPath: string, basePath?: string): string {
  return relative(basePath ?? process.cwd(), targetPath);
}

/**
 * Gets the file extension (without dot)
 */
export function getExtension(filePath: string): string {
  return extname(filePath).slice(1);
}

/**
 * Gets the filename without extension
 */
export function getBasename(filePath: string, withExt = false): string {
  const name = basename(filePath);
  return withExt ? name : name.replace(/\.[^.]+$/, '');
}

/**
 * Gets the directory name of a file path
 */
export function getDirectory(filePath: string): string {
  return dirname(filePath);
}

/**
 * Joins path segments
 */
export function joinPath(...segments: string[]): string {
  return join(...segments);
}

// =============================================================================
// Language Detection
// =============================================================================

export type SourceLanguage = 'typescript' | 'javascript';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const JS_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs']);

/**
 * Detects the language of a source file based on extension
 */
export function detectLanguage(filePath: string): SourceLanguage {
  const ext = extname(filePath);
  if (TS_EXTENSIONS.has(ext)) {
    return 'typescript';
  }
  if (JS_EXTENSIONS.has(ext)) {
    return 'javascript';
  }
  // Default to TypeScript for unknown extensions
  return 'typescript';
}

/**
 * Checks if a file is a TypeScript file
 */
export function isTypeScript(filePath: string): boolean {
  return TS_EXTENSIONS.has(extname(filePath));
}

/**
 * Checks if a file is a JavaScript file
 */
export function isJavaScript(filePath: string): boolean {
  return JS_EXTENSIONS.has(extname(filePath));
}

/**
 * Checks if a file is a source file (TS or JS)
 */
export function isSourceFile(filePath: string): boolean {
  const ext = extname(filePath);
  return TS_EXTENSIONS.has(ext) || JS_EXTENSIONS.has(ext);
}

/**
 * Checks if a file is a test file
 */
export function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return /\.(test|spec)\.[jt]sx?$/.test(name) || /^(test|spec)\.[jt]sx?$/.test(name);
}

// =============================================================================
// File Pattern Matching
// =============================================================================

export interface GlobOptions {
  cwd?: string;
  ignore?: string[];
  absolute?: boolean;
  onlyFiles?: boolean;
  onlyDirectories?: boolean;
}

/**
 * Default patterns to exclude when scanning codebase
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/__tests__/**',
  '**/__mocks__/**',
];

/**
 * Finds files matching glob patterns
 */
export async function globFiles(
  patterns: string | string[],
  options: GlobOptions = {}
): Promise<string[]> {
  const {
    cwd = process.cwd(),
    ignore = DEFAULT_EXCLUDE_PATTERNS,
    absolute = true,
    onlyFiles = true,
    onlyDirectories = false,
  } = options;

  return fg(patterns, {
    cwd,
    ignore,
    absolute,
    onlyFiles,
    onlyDirectories,
    dot: false,
  });
}

/**
 * Finds all source files in a directory
 */
export async function findSourceFiles(
  dir: string,
  options: { include?: string[]; exclude?: string[] } = {}
): Promise<string[]> {
  const patterns = options.include ?? ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const ignore = [...DEFAULT_EXCLUDE_PATTERNS, ...(options.exclude ?? [])];

  return globFiles(patterns, {
    cwd: dir,
    ignore,
    absolute: true,
    onlyFiles: true,
  });
}

// =============================================================================
// Test File Path Generation
// =============================================================================

/**
 * Generates the test file path for a source file
 */
export function getTestFilePath(
  sourceFile: string,
  options: {
    outputDir?: string;
    suffix?: string;
  } = {}
): string {
  const { outputDir, suffix = '.test' } = options;
  const dir = outputDir ?? dirname(sourceFile);
  const baseName = getBasename(sourceFile);
  const ext = extname(sourceFile);

  return join(dir, `${baseName}${suffix}${ext}`);
}

/**
 * Gets the source file path from a test file path
 */
export function getSourceFromTestPath(testFile: string): string {
  const dir = dirname(testFile);
  const name = basename(testFile);

  // Remove .test or .spec suffix
  const sourceName = name.replace(/\.(test|spec)(\.[jt]sx?)$/, '$2');

  return join(dir, sourceName);
}

// =============================================================================
// Import Path Resolution
// =============================================================================

/**
 * Resolves a relative import path to an absolute path
 */
export function resolveImportPath(
  importPath: string,
  fromFile: string,
  _baseDir?: string
): string {
  // External package (doesn't start with . or /)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return importPath; // Return as-is for external packages
  }

  const fromDir = dirname(fromFile);
  const resolved = resolve(fromDir, importPath);

  // Try adding extensions if the path doesn't have one
  if (!extname(resolved)) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (existsSync(withExt)) {
        return withExt;
      }
    }
  }

  return resolved;
}

/**
 * Converts an absolute path to an import path
 * Ensures .js extension for ESM compatibility
 */
export function toImportPath(
  targetFile: string,
  fromFile: string,
  useJsExtension = true
): string {
  const fromDir = dirname(fromFile);
  let relativePath = relative(fromDir, targetFile);

  // Ensure it starts with ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Convert to forward slashes (for Windows compatibility)
  relativePath = relativePath.replace(/\\/g, '/');

  // Convert .ts/.tsx to .js/.jsx for ESM imports
  if (useJsExtension) {
    relativePath = relativePath.replace(/\.tsx?$/, '.js');
  }

  return relativePath;
}

/**
 * Checks if an import path is an external package
 */
export function isExternalImport(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}

// =============================================================================
// Code Block Extraction
// =============================================================================

/**
 * Extracts the last code block from LLM response
 */
export function extractCodeBlock(response: string, language?: string): string {
  // Match code blocks with optional language specifier
  const pattern = language
    ? new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*?)\`\`\``, 'g')
    : /```(?:\w+)?\s*\n([\s\S]*?)```/g;

  const matches = [...response.matchAll(pattern)];

  if (matches.length === 0) {
    throw new ParseError('No code block found in response');
  }

  // Return the last code block (most likely the final/complete version)
  const lastMatch = matches[matches.length - 1];
  return lastMatch[1].trim();
}

/**
 * Extracts TypeScript/JavaScript code from response
 */
export function extractTestCode(response: string): string {
  // Try TypeScript first, then JavaScript
  try {
    return extractCodeBlock(response, 'typescript');
  } catch {
    try {
      return extractCodeBlock(response, 'javascript');
    } catch {
      return extractCodeBlock(response);
    }
  }
}
