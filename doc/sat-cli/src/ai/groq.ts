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
 * Generate tests for a source file using AI
 */
export async function generateTestsWithAI(
  sourceCode: string,
  options: {
    framework?: string;
    projectContext?: string;
    fileName?: string;
  } = {}
): Promise<string> {
  const { framework = 'jest', projectContext = '[]', fileName = 'unknown' } = options;

  const userPrompt = `
File: ${fileName}

Source Code:
\`\`\`typescript
${sourceCode}
\`\`\`

Generate comprehensive tests for this code.`;

  return runAgent('generator', userPrompt, {
    framework,
    projectContext,
  });
}

/**
 * Analyze a project structure using AI
 */
export async function analyzeProjectWithAI(projectInfo: string): Promise<any> {
  const result = await runAgent('analyzer', projectInfo);

  try {
    // Try to parse as JSON
    return JSON.parse(result);
  } catch {
    // If not valid JSON, return as raw analysis
    return { raw: result, parseError: true };
  }
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

  try {
    return JSON.parse(result);
  } catch {
    return { raw: result, parseError: true };
  }
}

/**
 * Review test quality
 */
export async function reviewTestsWithAI(testCode: string): Promise<any> {
  const result = await runAgent('reviewer', testCode);

  try {
    return JSON.parse(result);
  } catch {
    return { raw: result, parseError: true };
  }
}

/**
 * Fix failing tests
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
