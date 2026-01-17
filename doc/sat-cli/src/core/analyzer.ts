import * as fs from 'fs-extra';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';

export interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  isExported: boolean;
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: Array<{
    name: string;
    methods: FunctionInfo[];
  }>;
  filePath: string;
}

export async function analyzeCode(filePath: string): Promise<CodeAnalysis | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    
    if (ext !== '.ts' && ext !== '.tsx' && ext !== '.js' && ext !== '.jsx') {
      return null;
    }

    const ast = parse(content, {
      loc: true,
      range: true,
      tokens: true,
      comment: true,
      jsx: ext === '.tsx' || ext === '.jsx'
    });

    const functions: FunctionInfo[] = [];
    const classes: Array<{ name: string; methods: FunctionInfo[] }> = [];

    // Helper to extract function info
    function extractFunctionInfo(node: any, isExported: boolean): FunctionInfo | null {
      if (!node.id?.name) return null;
      return {
        name: node.id.name,
        parameters: node.params.map((p: any) => {
          if (p.type === 'Identifier') return p.name;
          if (p.type === 'AssignmentPattern' && p.left?.name) return p.left.name;
          return 'param';
        }),
        returnType: node.returnType?.typeAnnotation?.typeName?.name,
        isExported
      };
    }

    // Helper to extract class info
    function extractClassInfo(node: any, isExported: boolean) {
      if (!node.id?.name) return null;
      const methods: FunctionInfo[] = [];

      node.body.body.forEach((member: any) => {
        if (member.type === 'MethodDefinition' && member.key?.name) {
          methods.push({
            name: member.key.name,
            parameters: member.value.params.map((p: any) => {
              if (p.type === 'Identifier') return p.name;
              return 'param';
            }),
            isExported
          });
        }
      });

      return { name: node.id.name, methods };
    }

    // AST traversal with parent tracking
    function traverse(node: any, isInsideExport: boolean = false) {
      if (!node) return;

      // Handle export declarations - mark children as exported
      if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
        // Process the declaration inside the export
        if (node.declaration) {
          traverse(node.declaration, true);
        }
        // Process export specifiers (e.g., export { foo, bar })
        if (node.specifiers) {
          // These reference already-declared items, handled separately
        }
        return; // Don't traverse children again
      }

      // Function declarations
      if (node.type === 'FunctionDeclaration') {
        const funcInfo = extractFunctionInfo(node, isInsideExport);
        if (funcInfo) {
          functions.push(funcInfo);
        }
      }

      // Variable declarations with arrow functions or function expressions
      if (node.type === 'VariableDeclaration') {
        node.declarations.forEach((decl: any) => {
          if (decl.init?.type === 'ArrowFunctionExpression' ||
              decl.init?.type === 'FunctionExpression') {
            if (decl.id?.name) {
              functions.push({
                name: decl.id.name,
                parameters: decl.init.params.map((p: any) => {
                  if (p.type === 'Identifier') return p.name;
                  return 'param';
                }),
                isExported: isInsideExport
              });
            }
          }
        });
      }

      // Class declarations
      if (node.type === 'ClassDeclaration') {
        const classInfo = extractClassInfo(node, isInsideExport);
        if (classInfo) {
          classes.push(classInfo);
        }
      }

      // Recursively traverse children
      // Note: We don't propagate isInsideExport to children here because
      // export context only applies to direct declarations, not nested content.
      // The export declarations are handled explicitly above.
      for (const key in node) {
        if (key === 'parent' || key === 'range' || key === 'loc') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(c => traverse(c, false));
        } else if (child && typeof child === 'object' && child.type) {
          traverse(child, false);
        }
      }
    }

    traverse(ast);

    return {
      functions,
      classes,
      filePath
    };
  } catch (error) {
    console.error('Error analyzing code:', error);
    return null;
  }
}

