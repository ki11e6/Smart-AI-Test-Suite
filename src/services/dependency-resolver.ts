/**
 * Smart AI Test Suit - Dependency Resolver Service
 * Resolves imports, builds dependency graphs, and handles circular dependencies.
 */

import * as ts from 'typescript';
import { dirname, resolve, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile as fsReadFile } from 'node:fs/promises';
import type {
  ImportInfo,
  ImportSpecifier,
  ExportInfo,
  DependencyInfo,
  TypeInfo,
  FunctionSignature,
  ParameterInfo,
  DependencyGraph,
} from '../types.js';

// =============================================================================
// Dependency Resolution Result
// =============================================================================

export interface DependencyResolutionResult {
  dependencies: DependencyInfo[];
  graph: DependencyGraph;
  circularDependencies: string[][];
  resolvedCount: number;
  externalCount: number;
}

// =============================================================================
// Dependency Resolver Class
// =============================================================================

export class DependencyResolver {
  private readonly visitedFiles = new Set<string>();
  private readonly resolutionStack: string[] = [];
  private readonly circularDependencies: string[][] = [];
  private readonly dependencyCache = new Map<string, DependencyInfo>();

  /**
   * Reset the resolver state for a new resolution session
   */
  reset(): void {
    this.visitedFiles.clear();
    this.resolutionStack.length = 0;
    this.circularDependencies.length = 0;
    this.dependencyCache.clear();
  }

  /**
   * Resolve dependencies for a list of imports
   */
  async resolveDependencies(
    imports: ImportInfo[],
    fromFile: string
  ): Promise<DependencyResolutionResult> {
    this.reset();
    const dependencies: DependencyInfo[] = [];
    const graph: DependencyGraph = new Map();
    let resolvedCount = 0;
    let externalCount = 0;

    // Initialize the graph with the source file
    const normalizedFromFile = this.normalizePath(fromFile);
    graph.set(normalizedFromFile, []);

    for (const imp of imports) {
      const isExternal = this.isExternalImport(imp.path);

      if (isExternal) {
        externalCount++;
        dependencies.push(this.createExternalDependency(imp));
      } else {
        const resolvedPath = this.resolveImportPath(imp.path, fromFile);

        // Add to graph
        const deps = graph.get(normalizedFromFile) || [];
        deps.push(resolvedPath);
        graph.set(normalizedFromFile, deps);

        // Check for circular dependency before resolving
        if (this.isCircularDependency(resolvedPath)) {
          // Record the circular dependency
          const cycle = [...this.resolutionStack.slice(this.resolutionStack.indexOf(resolvedPath)), resolvedPath];
          this.circularDependencies.push(cycle);

          // Still add a minimal dependency info
          dependencies.push({
            path: imp.path,
            isExternal: false,
            exports: [],
            types: [],
            functionSignatures: [],
          });
        } else if (existsSync(resolvedPath)) {
          try {
            const depInfo = await this.analyzeLocalDependency(
              resolvedPath,
              imp.specifiers,
              graph
            );
            dependencies.push(depInfo);
            resolvedCount++;
          } catch {
            dependencies.push(this.createPlaceholderDependency(imp.path));
          }
        } else {
          dependencies.push(this.createPlaceholderDependency(imp.path));
        }
      }
    }

    return {
      dependencies,
      graph,
      circularDependencies: this.circularDependencies,
      resolvedCount,
      externalCount,
    };
  }

  /**
   * Build a complete dependency graph for a file
   */
  async buildDependencyGraph(
    startFile: string,
    maxDepth = 5
  ): Promise<DependencyGraph> {
    this.reset();
    const graph: DependencyGraph = new Map();

    await this.traverseDependencies(startFile, graph, 0, maxDepth);

    return graph;
  }

  /**
   * Perform topological sort on a dependency graph
   * Returns files in order: leaves first, dependents last
   */
  topologicalSort(graph: DependencyGraph): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (file: string): void => {
      if (visited.has(file)) return;
      if (visiting.has(file)) {
        // Circular dependency detected, skip
        return;
      }

      visiting.add(file);
      const deps = graph.get(file) || [];

      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(file);
      visited.add(file);
      sorted.push(file);
    };

    for (const file of graph.keys()) {
      visit(file);
    }

    return sorted;
  }

  /**
   * Get all circular dependencies found during resolution
   */
  getCircularDependencies(): string[][] {
    return [...this.circularDependencies];
  }

  // =============================================================================
  // Private Methods - Path Resolution
  // =============================================================================

  /**
   * Check if an import path is external (npm package)
   */
  private isExternalImport(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  /**
   * Resolve a relative import path to an absolute path
   */
  private resolveImportPath(importPath: string, fromFile: string): string {
    if (this.isExternalImport(importPath)) {
      return importPath;
    }

    const fromDir = dirname(fromFile);
    const resolved = resolve(fromDir, importPath);

    // Handle .js to .ts resolution (ESM import paths use .js)
    if (resolved.endsWith('.js')) {
      const tsPath = resolved.replace(/\.js$/, '.ts');
      if (existsSync(tsPath)) {
        return tsPath;
      }
      const tsxPath = resolved.replace(/\.js$/, '.tsx');
      if (existsSync(tsxPath)) {
        return tsxPath;
      }
    }

    // Try adding extensions if the path doesn't have one
    if (!extname(resolved)) {
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (existsSync(withExt)) {
          return withExt;
        }
      }

      // Try index files
      for (const ext of extensions) {
        const indexPath = resolve(resolved, `index${ext}`);
        if (existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return resolved;
  }

  /**
   * Normalize a path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    return resolve(filePath).replace(/\\/g, '/');
  }

  // =============================================================================
  // Private Methods - Circular Dependency Detection
  // =============================================================================

  /**
   * Check if resolving a file would create a circular dependency
   */
  private isCircularDependency(filePath: string): boolean {
    const normalized = this.normalizePath(filePath);
    return this.resolutionStack.includes(normalized);
  }

  /**
   * Push a file onto the resolution stack
   */
  private pushToStack(filePath: string): void {
    this.resolutionStack.push(this.normalizePath(filePath));
  }

  /**
   * Pop a file from the resolution stack
   */
  private popFromStack(): void {
    this.resolutionStack.pop();
  }

  // =============================================================================
  // Private Methods - Dependency Analysis
  // =============================================================================

  /**
   * Traverse dependencies recursively to build graph
   */
  private async traverseDependencies(
    filePath: string,
    graph: DependencyGraph,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    const normalized = this.normalizePath(filePath);

    if (this.visitedFiles.has(normalized) || depth >= maxDepth) {
      return;
    }

    this.visitedFiles.add(normalized);

    if (!existsSync(filePath)) {
      return;
    }

    try {
      const sourceCode = await fsReadFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        this.getScriptKind(filePath)
      );

      const imports = this.extractImports(sourceFile);
      const deps: string[] = [];

      for (const imp of imports) {
        if (!this.isExternalImport(imp.path)) {
          const resolvedPath = this.resolveImportPath(imp.path, filePath);
          if (existsSync(resolvedPath)) {
            deps.push(this.normalizePath(resolvedPath));
            await this.traverseDependencies(resolvedPath, graph, depth + 1, maxDepth);
          }
        }
      }

      graph.set(normalized, deps);
    } catch {
      // Failed to analyze file, skip
    }
  }

  /**
   * Analyze a local dependency file
   */
  private async analyzeLocalDependency(
    filePath: string,
    _importedSpecifiers: ImportSpecifier[],
    graph: DependencyGraph
  ): Promise<DependencyInfo> {
    const normalized = this.normalizePath(filePath);

    // Check cache first
    if (this.dependencyCache.has(normalized)) {
      return this.dependencyCache.get(normalized)!;
    }

    // Mark as visited to prevent infinite loops
    this.visitedFiles.add(normalized);
    this.pushToStack(filePath);

    try {
      const sourceCode = await fsReadFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        this.getScriptKind(filePath)
      );

      const exports = this.extractExports(sourceFile);
      const types = this.extractTypes(sourceFile);
      const functionSignatures = this.extractFunctionSignatures(sourceFile);

      // Recursively resolve this file's dependencies
      const imports = this.extractImports(sourceFile);
      const nestedDeps: string[] = [];

      for (const imp of imports) {
        if (!this.isExternalImport(imp.path)) {
          const resolvedPath = this.resolveImportPath(imp.path, filePath);
          if (!this.isCircularDependency(resolvedPath) && existsSync(resolvedPath)) {
            nestedDeps.push(this.normalizePath(resolvedPath));
          }
        }
      }

      // Add to graph
      graph.set(normalized, nestedDeps);

      const depInfo: DependencyInfo = {
        path: filePath,
        isExternal: false,
        exports,
        types,
        functionSignatures,
      };

      // Cache the result
      this.dependencyCache.set(normalized, depInfo);

      return depInfo;
    } finally {
      this.popFromStack();
    }
  }

  /**
   * Create a dependency info for external packages
   */
  private createExternalDependency(imp: ImportInfo): DependencyInfo {
    return {
      path: imp.path,
      isExternal: true,
      exports: [],
      types: [],
      functionSignatures: imp.specifiers
        .filter((s) => !s.isType)
        .map((s) => ({
          name: s.alias ?? s.name,
          params: [],
          returnType: 'unknown',
          isAsync: false,
          isExported: true,
        })),
    };
  }

  /**
   * Create a placeholder dependency for unresolved imports
   */
  private createPlaceholderDependency(importPath: string): DependencyInfo {
    return {
      path: importPath,
      isExternal: false,
      exports: [],
      types: [],
      functionSignatures: [],
    };
  }

  /**
   * Get TypeScript script kind based on file extension
   */
  private getScriptKind(filePath: string): ts.ScriptKind {
    const ext = extname(filePath);
    switch (ext) {
      case '.ts':
        return ts.ScriptKind.TS;
      case '.tsx':
        return ts.ScriptKind.TSX;
      case '.jsx':
        return ts.ScriptKind.JSX;
      default:
        return ts.ScriptKind.JS;
    }
  }

  // =============================================================================
  // Private Methods - AST Parsing
  // =============================================================================

  /**
   * Extract import statements from source file
   */
  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.parseImportDeclaration(node);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Parse a single import declaration
   */
  private parseImportDeclaration(node: ts.ImportDeclaration): ImportInfo | null {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    const path = moduleSpecifier.text;
    const specifiers: ImportSpecifier[] = [];
    let isDefault = false;
    let isNamespace = false;

    const importClause = node.importClause;
    if (importClause) {
      if (importClause.name) {
        isDefault = true;
        specifiers.push({
          name: importClause.name.text,
          isType: importClause.isTypeOnly ?? false,
        });
      }

      const namedBindings = importClause.namedBindings;
      if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings)) {
          isNamespace = true;
          specifiers.push({
            name: namedBindings.name.text,
            isType: importClause.isTypeOnly ?? false,
          });
        } else if (ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            specifiers.push({
              name: element.name.text,
              alias: element.propertyName?.text,
              isType: element.isTypeOnly ?? importClause.isTypeOnly ?? false,
            });
          }
        }
      }
    }

    return {
      path,
      specifiers,
      isDefault,
      isNamespace,
    };
  }

  /**
   * Extract export statements from source file
   */
  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push({
              name: decl.name.text,
              isDefault: false,
              isType: false,
              kind: 'variable',
            });
          }
        }
      }

      if (ts.isFunctionDeclaration(node) && node.name && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: this.hasDefaultModifier(node),
          isType: false,
          kind: 'function',
        });
      }

      if (ts.isClassDeclaration(node) && node.name && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: this.hasDefaultModifier(node),
          isType: false,
          kind: 'class',
        });
      }

      if (ts.isInterfaceDeclaration(node) && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isType: true,
          kind: 'interface',
        });
      }

      if (ts.isTypeAliasDeclaration(node) && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isType: true,
          kind: 'type',
        });
      }

      if (ts.isEnumDeclaration(node) && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isType: false,
          kind: 'enum',
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * Extract type definitions from source file
   */
  private extractTypes(sourceFile: ts.SourceFile): TypeInfo[] {
    const types: TypeInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isInterfaceDeclaration(node)) {
        types.push({
          name: node.name.text,
          definition: node.getText(sourceFile),
          kind: 'interface',
        });
      }

      if (ts.isTypeAliasDeclaration(node)) {
        types.push({
          name: node.name.text,
          definition: node.getText(sourceFile),
          kind: 'type',
        });
      }

      if (ts.isEnumDeclaration(node)) {
        types.push({
          name: node.name.text,
          definition: node.getText(sourceFile),
          kind: 'enum',
        });
      }

      if (ts.isClassDeclaration(node) && node.name) {
        types.push({
          name: node.name.text,
          definition: this.getClassSignature(node, sourceFile),
          kind: 'class',
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return types;
  }

  /**
   * Get class signature (without implementation)
   */
  private getClassSignature(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string {
    const name = node.name?.text ?? 'AnonymousClass';
    const methods: string[] = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const methodName = member.name.getText(sourceFile);
        const params = member.parameters.map((p) => p.getText(sourceFile)).join(', ');
        const returnType = member.type?.getText(sourceFile) ?? 'void';
        methods.push(`  ${methodName}(${params}): ${returnType};`);
      }
    }

    return `class ${name} {\n${methods.join('\n')}\n}`;
  }

  /**
   * Extract function signatures from source file
   */
  private extractFunctionSignatures(sourceFile: ts.SourceFile): FunctionSignature[] {
    const signatures: FunctionSignature[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        signatures.push(this.parseFunctionSignature(node, sourceFile));
      }

      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            ts.isIdentifier(decl.name) &&
            decl.initializer &&
            ts.isArrowFunction(decl.initializer)
          ) {
            signatures.push(
              this.parseArrowFunctionSignature(decl.name.text, decl.initializer, sourceFile, node)
            );
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return signatures;
  }

  /**
   * Parse function declaration signature
   */
  private parseFunctionSignature(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionSignature {
    const name = node.name?.text ?? 'anonymous';
    const params = this.parseParameters(node.parameters, sourceFile);
    const returnType = node.type?.getText(sourceFile) ?? 'void';
    const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    const isExported = this.hasExportModifier(node);

    return {
      name,
      params,
      returnType,
      isAsync,
      isExported,
    };
  }

  /**
   * Parse arrow function signature
   */
  private parseArrowFunctionSignature(
    name: string,
    node: ts.ArrowFunction,
    sourceFile: ts.SourceFile,
    parent: ts.VariableStatement
  ): FunctionSignature {
    const params = this.parseParameters(node.parameters, sourceFile);
    const returnType = node.type?.getText(sourceFile) ?? 'void';
    const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    const isExported = this.hasExportModifier(parent);

    return {
      name,
      params,
      returnType,
      isAsync,
      isExported,
    };
  }

  /**
   * Parse function parameters
   */
  private parseParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile
  ): ParameterInfo[] {
    return parameters.map((param) => {
      const name = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
      const type = param.type?.getText(sourceFile) ?? 'any';
      const isOptional = param.questionToken !== undefined || param.initializer !== undefined;
      const defaultValue = param.initializer?.getText(sourceFile);

      return {
        name,
        type,
        isOptional,
        defaultValue,
      };
    });
  }

  /**
   * Check if a node has the export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  /**
   * Check if a node has the default modifier
   */
  private hasDefaultModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let resolverInstance: DependencyResolver | null = null;

/**
 * Get the dependency resolver singleton
 */
export function getDependencyResolver(): DependencyResolver {
  if (!resolverInstance) {
    resolverInstance = new DependencyResolver();
  }
  return resolverInstance;
}

/**
 * Create a new dependency resolver instance
 */
export function createDependencyResolver(): DependencyResolver {
  return new DependencyResolver();
}
