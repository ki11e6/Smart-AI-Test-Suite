import Groq from 'groq-sdk';
import { loadConfig } from '../config/settings';
import { getAgent, buildPrompt, AgentType } from './agents';
import { satError } from '../ui/logger';

let groqClient: Groq | null = null;
let currentModel: string = 'llama-3.3-70b-versatile';

/**
 * Initialize the Groq client
 * Lazily creates the client on first use
 */
export async function initGroq(): Promise<Groq> {
  if (groqClient) {
    return groqClient;
  }

  const config = await loadConfig();

  if (!config.groqApiKey) {
    throw new Error(
      'GROQ_API_KEY not configured.\n' +
      'Set it in your environment or run `sat init` to configure.'
    );
  }

  currentModel = config.model;
  groqClient = new Groq({ apiKey: config.groqApiKey });
  return groqClient;
}

/**
 * Check if Groq is properly configured
 */
export async function isGroqConfigured(): Promise<boolean> {
  try {
    const config = await loadConfig();
    return !!config.groqApiKey;
  } catch {
    return false;
  }
}

/**
 * Run an agent with the specified prompt
 */
export async function runAgent(
  agentType: AgentType,
  userPrompt: string,
  variables: Record<string, string> = {}
): Promise<string> {
  const groq = await initGroq();
  const agent = getAgent(agentType);

  // Build the system prompt with variables
  const systemPrompt = buildPrompt(agent.systemPrompt, variables);

  try {
    const response = await groq.chat.completions.create({
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    return content.trim();
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Invalid GROQ_API_KEY. Please check your API key.');
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw error;
  }
}

/**
 * Generate framework-specific import example
 */
function buildImportExample(framework: string, importPath: string, exports: string[]): string {
  const exportsStr = exports.length > 0 ? exports.join(', ') : 'myFunction';

  switch (framework) {
    case 'vitest':
      return `import { describe, it, expect } from 'vitest';
import { ${exportsStr} } from '${importPath}';

describe('${exports[0] || 'myFunction'}', () => {
  it('should work', () => {
    expect(${exports[0] || 'myFunction'}).toBeDefined();
  });
});`;
    case 'mocha':
      return `import { expect } from 'chai';
import { ${exportsStr} } from '${importPath}';

describe('${exports[0] || 'myFunction'}', () => {
  it('should work', () => {
    expect(${exports[0] || 'myFunction'}).to.exist;
  });
});`;
    case 'jest':
    default:
      return `// Jest: describe, it, expect are globals - do NOT import them
import { ${exportsStr} } from '${importPath}';

describe('${exports[0] || 'myFunction'}', () => {
  it('should work', () => {
    expect(${exports[0] || 'myFunction'}).toBeDefined();
  });
});`;
  }
}

/**
 * Generate tests for a source file using AI
 */
export async function generateTestsWithAI(
  sourceCode: string,
  options: {
    framework?: string;
    projectContext?: string;
    fileName?: string;
    importPath?: string;
    exports?: string[];
  } = {}
): Promise<string> {
  const {
    framework = 'jest',
    projectContext = '[]',
    fileName = 'unknown',
    importPath = '../unknown',
    exports = []
  } = options;

  const importExample = buildImportExample(framework, importPath, exports);

  const userPrompt = `
File: ${fileName}
Import path from test file to source: ${importPath}

Source Code:
${sourceCode}

Generate comprehensive tests for this code. Use import path "${importPath}" exactly.`;

  return runAgent('generator', userPrompt, {
    framework,
    projectContext,
    importPath,
    importExample,
  });
}

/**
 * Clean JSON response from markdown code blocks
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```\s*$/i, '');
  }

  return cleaned.trim();
}

/**
 * Parse AI response as JSON with markdown handling
 */
function parseJsonResponse(response: string): any {
  const cleaned = cleanJsonResponse(response);

  try {
    return JSON.parse(cleaned);
  } catch {
    // If still can't parse, return as raw
    return { raw: response, parseError: true };
  }
}

/**
 * Analyze a project structure using AI
 */
export async function analyzeProjectWithAI(projectInfo: string): Promise<any> {
  const result = await runAgent('analyzer', projectInfo);
  return parseJsonResponse(result);
}

/**
 * Suggest missing tests for a file
 */
export async function suggestTestsWithAI(
  sourceCode: string,
  existingTests?: string
): Promise<any> {
  let prompt = `Source Code:\n\`\`\`\n${sourceCode}\n\`\`\``;

  if (existingTests) {
    prompt += `\n\nExisting Tests:\n\`\`\`\n${existingTests}\n\`\`\``;
  }

  const result = await runAgent('suggester', prompt);
  return parseJsonResponse(result);
}

/**
 * Review test quality
 */
export async function reviewTestsWithAI(testCode: string): Promise<any> {
  const result = await runAgent('reviewer', testCode);
  return parseJsonResponse(result);
}

/**
 * Fix failing tests based on error messages
 */
export async function fixTestsWithAI(
  testCode: string,
  errorMessage: string,
  sourceCode?: string
): Promise<string> {
  let prompt = `Test Code:\n\`\`\`\n${testCode}\n\`\`\`\n\nError:\n${errorMessage}`;

  if (sourceCode) {
    prompt += `\n\nOriginal Source:\n\`\`\`\n${sourceCode}\n\`\`\``;
  }

  return runAgent('fixer', prompt);
}

/**
 * Improve tests based on review suggestions
 */
export async function improveTestsWithAI(
  testCode: string,
  review: {
    score?: number;
    weaknesses?: string[];
    suggestions?: Array<{ issue: string; fix: string; priority: string }>;
  },
  sourceCode?: string
): Promise<string> {
  // Build improvement prompt from review
  let issuesList = '';

  if (review.weaknesses && review.weaknesses.length > 0) {
    issuesList += 'Weaknesses to address:\n';
    review.weaknesses.forEach((w, i) => {
      issuesList += `${i + 1}. ${w}\n`;
    });
  }

  if (review.suggestions && review.suggestions.length > 0) {
    issuesList += '\nSuggestions to implement:\n';
    review.suggestions.forEach((s, i) => {
      issuesList += `${i + 1}. [${s.priority.toUpperCase()}] ${s.issue}\n   Fix: ${s.fix}\n`;
    });
  }

  let prompt = `Test Code:\n\`\`\`\n${testCode}\n\`\`\`

Review Issues to Fix:
${issuesList}

Improve the test code by addressing all the issues above. Focus on high priority issues first.`;

  if (sourceCode) {
    prompt += `\n\nOriginal Source Code:\n\`\`\`\n${sourceCode}\n\`\`\``;
  }

  return runAgent('fixer', prompt);
}

/**
 * Simple completion without agent context
 * Useful for quick one-off requests
 */
export async function complete(prompt: string): Promise<string> {
  const groq = await initGroq();

  const response = await groq.chat.completions.create({
    model: currentModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2048,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}
