/**
 * Smart AI Test Suit - Analyzer Agent
 * Analyzes source files to extract imports, exports, and dependencies.
 */

import * as ts from 'typescript';
import type {
  AgentContext,
  AnalyzerInput,
  AnalyzerOutput,
  ImportInfo,
  ImportSpecifier,
  ExportInfo,
  DependencyInfo,
} from './types.js';
import { BaseAgent } from './base.js';
import { readFile, detectLanguage, exists } from '../utils/file.js';
import { FileNotFoundError } from '../utils/errors.js';
import { createDependencyResolver } from '../services/dependency-resolver.js';

export class AnalyzerAgent extends BaseAgent<AnalyzerInput, AnalyzerOutput> {
  readonly name = 'Analyzer';

  /**
   * Analyze a source file
   */
  protected async run(input: AnalyzerInput, _context: AgentContext): Promise<AnalyzerOutput> {
    const { filePath } = input;

    // Read source file
    if (!exists(filePath)) {
      throw new FileNotFoundError(filePath);
    }

    const sourceCode = await readFile(filePath);
    const language = detectLanguage(filePath);

    // Parse the source code
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS
    );

    // Extract imports
    const imports = this.extractImports(sourceFile);

    // Extract exports
    const exports = this.extractExports(sourceFile);

    // Resolve dependencies (with circular dependency detection)
    const { dependencies, circularDependencies } = await this.resolveDependencies(imports, filePath);

    return {
      sourceCode,
      language,
      imports,
      exports,
      dependencies,
      circularDependencies,
    };
  }

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
      // Default import: import foo from 'module'
      if (importClause.name) {
        isDefault = true;
        specifiers.push({
          name: importClause.name.text,
          isType: importClause.isTypeOnly ?? false,
        });
      }

      // Named or namespace imports
      const namedBindings = importClause.namedBindings;
      if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings)) {
          // Namespace import: import * as foo from 'module'
          isNamespace = true;
          specifiers.push({
            name: namedBindings.name.text,
            isType: importClause.isTypeOnly ?? false,
          });
        } else if (ts.isNamedImports(namedBindings)) {
          // Named imports: import { foo, bar } from 'module'
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
      // Export declarations
      if (ts.isExportDeclaration(node)) {
        // Re-exports: export { foo } from 'module'
        // Skip for now - focus on local exports
      }

      // Exported variable declarations
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

      // Exported function declarations
      if (ts.isFunctionDeclaration(node) && node.name && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: this.hasDefaultModifier(node),
          isType: false,
          kind: 'function',
        });
      }

      // Exported class declarations
      if (ts.isClassDeclaration(node) && node.name && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: this.hasDefaultModifier(node),
          isType: false,
          kind: 'class',
        });
      }

      // Exported interface declarations
      if (ts.isInterfaceDeclaration(node) && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isType: true,
          kind: 'interface',
        });
      }

      // Exported type alias declarations
      if (ts.isTypeAliasDeclaration(node) && this.hasExportModifier(node)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isType: true,
          kind: 'type',
        });
      }

      // Exported enum declarations
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

  /**
   * Resolve dependencies from imports using the DependencyResolver service
   * Handles circular dependencies gracefully
   */
  private async resolveDependencies(
    imports: ImportInfo[],
    fromFile: string
  ): Promise<{ dependencies: DependencyInfo[]; circularDependencies?: string[][] }> {
    const resolver = createDependencyResolver();
    const result = await resolver.resolveDependencies(imports, fromFile);

    return {
      dependencies: result.dependencies,
      circularDependencies: result.circularDependencies.length > 0
        ? result.circularDependencies
        : undefined,
    };
  }
}
