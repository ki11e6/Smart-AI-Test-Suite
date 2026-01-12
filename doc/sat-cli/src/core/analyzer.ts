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

    // Simple AST traversal to find functions and classes
    function traverse(node: any) {
      if (!node) return;

      // Function declarations
      if (node.type === 'FunctionDeclaration' && node.id) {
        const isExported = node.parent?.type === 'ExportNamedDeclaration' || 
                          node.parent?.type === 'ExportDefaultDeclaration';
        
        functions.push({
          name: node.id.name,
          parameters: node.params.map((p: any) => {
            if (p.type === 'Identifier') return p.name;
            if (p.type === 'AssignmentPattern' && p.left) return p.left.name;
            return 'param';
          }),
          returnType: node.returnType?.typeAnnotation?.typeName?.name,
          isExported
        });
      }

      // Arrow functions and function expressions (exported)
      if ((node.type === 'VariableDeclarator' || node.type === 'ExportNamedDeclaration') && 
          node.init?.type === 'ArrowFunctionExpression') {
        const isExported = node.type === 'ExportNamedDeclaration' || 
                          node.parent?.type === 'ExportNamedDeclaration';
        
        if (node.id?.name) {
          functions.push({
            name: node.id.name,
            parameters: node.init.params.map((p: any) => {
              if (p.type === 'Identifier') return p.name;
              return 'param';
            }),
            isExported
          });
        }
      }

      // Class declarations
      if (node.type === 'ClassDeclaration' && node.id) {
        const methods: FunctionInfo[] = [];
        const isExported = node.parent?.type === 'ExportNamedDeclaration' || 
                          node.parent?.type === 'ExportDefaultDeclaration';

        node.body.body.forEach((member: any) => {
          if (member.type === 'MethodDefinition' && member.key) {
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

        classes.push({
          name: node.id.name,
          methods
        });
      }

      // Recursively traverse children
      for (const key in node) {
        if (key === 'parent' || key === 'range' || key === 'loc') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object' && child.type) {
          traverse(child);
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

