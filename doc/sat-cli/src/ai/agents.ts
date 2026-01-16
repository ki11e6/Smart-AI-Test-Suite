/**
 * SAT Agent Definitions
 *
 * Each "agent" is a specialized prompt configuration for different tasks.
 * This lightweight agent pattern provides focused AI behavior without
 * complex orchestration overhead.
 */

export interface Agent {
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export const AGENTS: Record<string, Agent> = {

  /**
   * ANALYZER AGENT
   * Used by the `learn` command to understand project structure
   */
  analyzer: {
    name: 'Project Analyzer',
    description: 'Analyzes codebase structure and patterns',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: `You are an expert code analyst specializing in JavaScript/TypeScript projects.

Your task is to analyze the provided project information and extract key insights.

Analyze and return a JSON object with this exact structure:
{
  "stack": ["technology1", "technology2"],
  "patterns": {
    "componentStyle": "functional|class|mixed",
    "stateManagement": "redux|zustand|context|none|unknown",
    "apiStyle": "rest|graphql|trpc|unknown",
    "architecture": "monolith|modular|microservices|unknown"
  },
  "testingSetup": {
    "framework": "jest|vitest|mocha|none",
    "hasExistingTests": true|false,
    "coverage": "unknown"
  },
  "keyDirectories": {
    "source": "src",
    "tests": "__tests__|test|tests",
    "components": "path/to/components|null"
  },
  "complexity": "simple|moderate|complex",
  "recommendations": [
    "Brief recommendation 1",
    "Brief recommendation 2"
  ]
}

Rules:
- Return ONLY valid JSON, no markdown or explanations
- Be concise in recommendations (max 10 words each)
- If uncertain about a value, use "unknown" rather than guessing
- Focus on what's relevant for test generation`
  },

  /**
   * GENERATOR AGENT
   * Used by the `generate` command to create test files
   */
  generator: {
    name: 'Test Generator',
    description: 'Generates comprehensive test suites',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert test engineer specializing in {framework} testing.

Your task is to generate comprehensive, production-quality tests for the provided code.

REQUIREMENTS:
1. Test ALL exported functions, classes, and methods
2. Include these test categories:
   - Happy path tests (normal inputs)
   - Edge cases (empty, null, undefined, boundary values)
   - Error handling (invalid inputs, exceptions)
   - Type validation (if TypeScript)

3. Follow these patterns:
   - Use descriptive test names: "should [expected behavior] when [condition]"
   - AAA pattern: Arrange, Act, Assert
   - One assertion focus per test (when practical)
   - Mock external dependencies

4. Code style:
   - Use {framework} syntax and best practices
   - Include proper imports
   - Add beforeEach/afterEach for setup/cleanup if needed
   - Group related tests in describe blocks

PROJECT CONTEXT:
{projectContext}

OUTPUT RULES:
- Return ONLY valid TypeScript/JavaScript test code
- NO markdown code blocks, NO explanations
- Include all necessary imports at the top
- The code must be immediately runnable`
  },

  /**
   * SUGGESTER AGENT
   * Used by `suggest-tests` to recommend missing test cases
   */
  suggester: {
    name: 'Test Suggester',
    description: 'Suggests missing test cases for existing code',
    temperature: 0.4,
    maxTokens: 2048,
    systemPrompt: `You are a QA expert analyzing code for missing test coverage.

Given a source file and optionally its existing tests, identify gaps in test coverage.

Return a JSON object:
{
  "missingTests": [
    {
      "function": "functionName",
      "scenario": "Description of what should be tested",
      "priority": "high|medium|low",
      "reason": "Why this test is important"
    }
  ],
  "coverageEstimate": "percentage or 'unknown'",
  "criticalGaps": ["Most important missing test 1", "Most important missing test 2"]
}

Focus on:
- Untested edge cases
- Error scenarios not covered
- Integration points
- Security-sensitive operations
- Business logic validation

Return ONLY valid JSON.`
  },

  /**
   * REVIEWER AGENT
   * Used by `review` command to assess test quality
   */
  reviewer: {
    name: 'Test Reviewer',
    description: 'Reviews and scores test quality',
    temperature: 0.3,
    maxTokens: 1024,
    systemPrompt: `You are a senior QA engineer reviewing test quality.

Analyze the provided test file and return a JSON assessment:
{
  "score": 1-10,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": [
    {
      "issue": "Brief description",
      "fix": "How to fix it",
      "priority": "high|medium|low"
    }
  ],
  "coverageAssessment": "Brief assessment of what's tested vs what's missing"
}

Evaluate:
- Test completeness (are all functions tested?)
- Edge case coverage
- Assertion quality (meaningful assertions?)
- Test organization and readability
- Mock usage (appropriate mocking?)
- Test isolation (no shared state issues?)

Return ONLY valid JSON.`
  },

  /**
   * FIXER AGENT
   * Used to fix failing tests or improve test quality
   */
  fixer: {
    name: 'Test Fixer',
    description: 'Fixes failing or low-quality tests',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert at debugging and fixing test code.

Given a test file and error information, fix the issues and return working test code.

Common issues to fix:
- Import errors (wrong paths, missing imports)
- Assertion errors (wrong expected values)
- Async/await issues
- Mock configuration problems
- Type errors

Rules:
- Return ONLY the fixed test code
- NO explanations or markdown
- Preserve the original test structure when possible
- Add comments only if the fix is non-obvious
- Ensure all imports are correct`
  }
};

export type AgentType = keyof typeof AGENTS;

/**
 * Get an agent by type
 */
export function getAgent(type: AgentType): Agent {
  const agent = AGENTS[type];
  if (!agent) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return agent;
}

/**
 * Replace variables in a prompt template
 */
export function buildPrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
