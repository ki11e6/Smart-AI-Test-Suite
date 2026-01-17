---
project_name: 'Smart AI Test Suit'
date: '2026-01-17'
version: '2.0'
source: 'architecture.md (v2.0)'
status: 'complete'
---

# Project Context for AI Agents v2.0

_Critical rules for implementing Smart AI Test Suit. Read before writing any code._

---

## Quick Reference (READ FIRST)

1. **Exit codes:** 0=success, 2=file not found, 3=provider error, 4=timeout, 5=bad response, 6=tests failed, 7=lint error
2. **Error format:** `Error: [E0XX] Description. Fix.`
3. **Parser:** Extract LAST code block, not first
4. **Imports:** Use `.js` extension (ESM requirement)
5. **HTTP calls:** ONLY in `providers/*.ts` files
6. **Tests:** Use `vi` from Vitest, not `jest`
7. **Agents:** All agents implement `Agent<TInput, TOutput>` interface
8. **Providers:** All providers implement `LLMProvider` interface

---

## Technology Stack

| Tech | Version | Note |
|------|---------|------|
| TypeScript | 5.x | Strict mode enabled |
| Node.js | 20+ | ESM, use `.js` extensions |
| Ink | 4+ | React-based TUI |
| React | 18+ | Required by Ink |
| Commander | 11+ | CLI argument parsing |
| Vitest | latest | Testing framework (NOT Jest) |

### LLM Provider SDKs

| Provider | Package | Default Model |
|----------|---------|---------------|
| Ollama | `ollama` | codellama |
| Groq | `groq-sdk` | llama-3.1-70b-versatile |
| OpenAI | `openai` | gpt-4 |
| Anthropic | `@anthropic-ai/sdk` | claude-3-opus-20240229 |

### Quality Tools

| Tool | Package | Purpose |
|------|---------|---------|
| ESLint | `eslint` | Lint validation |
| fast-glob | `fast-glob` | File discovery |
| TypeScript | `typescript` | AST parsing |

---

## Critical Implementation Rules

### Exit Codes (MUST follow exactly)

| Code | Constant | When to use |
|------|----------|-------------|
| 0 | EXIT_SUCCESS | All operations successful |
| 1 | EXIT_GENERAL_ERROR | Unexpected failures |
| 2 | EXIT_FILE_NOT_FOUND | Source file doesn't exist |
| 3 | EXIT_PROVIDER_ERROR | Can't reach LLM provider |
| 4 | EXIT_TIMEOUT | LLM response > timeout |
| 5 | EXIT_INVALID_RESPONSE | No usable code in LLM output |
| 6 | EXIT_TESTS_FAILED | Tests failed after max retries |
| 7 | EXIT_LINT_ERROR | Unfixable lint errors |

### Error Message Format (MUST follow exactly)

```
Error: [E0XX] Short description. Suggested fix.
```

Examples:
- `Error: [E002] File not found: ./src/utils.ts. Check the path and try again.`
- `Error: [E003] Cannot connect to Groq. Check your GROQ_API_KEY.`
- `Error: [E006] Tests failed after 3 attempts. Review failures manually.`

### LLM Response Parsing (CRITICAL)

Extract the **LAST** code block, not first. LLMs explain then give final code.

```typescript
function parseCodeFromResponse(response: string): string {
  const blocks = [...response.matchAll(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/g)];
  return blocks.length > 0 ? blocks[blocks.length - 1][1].trim() : response.trim();
}
```

### Layer Boundaries (MUST respect)

| Layer | Files | Can Do |
|-------|-------|--------|
| Providers | `providers/*.ts` | Make external HTTP/API calls |
| Agents | `agents/*.ts` | Orchestrate, call providers |
| Services | `services/*.ts` | Business logic, file ops |
| Utils | `utils/*.ts` | Pure functions, helpers |
| Commands | `commands/*.ts` | CLI command handlers |
| TUI | `app.tsx` | Presentation only |

### ESM Import Rules (CRITICAL)

Node.js ESM requires `.js` extensions even for TypeScript files:

```typescript
// WRONG (will fail at runtime)
import { AnalyzerAgent } from './agents/analyzer';
import { GroqProvider } from './providers/groq';

// CORRECT (ESM requires .js extension)
import { AnalyzerAgent } from './agents/analyzer.js';
import { GroqProvider } from './providers/groq.js';
```

### Async/Await Pattern

All provider and service calls are async:

```typescript
// ALL external calls must be awaited
const provider = ProviderFactory.create(config);
const response = await provider.generate(prompt);
const tests = parseCodeFromResponse(response); // sync - no await
```

---

## Agent System Rules

### Agent Interface (ALL agents MUST implement)

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
}

interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metrics?: AgentMetrics;
}
```

### Agent Communication Pattern

```typescript
// Pass data between agents via AgentResult.data
const analyzerResult = await analyzerAgent.execute(filePath, context);

if (!analyzerResult.success) {
  return handleError(analyzerResult.error);
}

// Next agent receives previous agent's data
const writerResult = await writerAgent.execute(analyzerResult.data, context);
```

### Agent Implementation Template

```typescript
// src/agents/example.ts
import { Agent, AgentContext, AgentResult } from './types.js';

interface ExampleInput { /* ... */ }
interface ExampleOutput { /* ... */ }

export class ExampleAgent implements Agent<ExampleInput, ExampleOutput> {
  name = 'Example';

  async execute(
    input: ExampleInput,
    context: AgentContext
  ): Promise<AgentResult<ExampleOutput>> {
    try {
      // Agent logic here
      return { success: true, data: { /* ... */ } };
    } catch (error) {
      return { success: false, error: { message: error.message } };
    }
  }
}
```

---

## Provider System Rules

### Provider Interface (ALL providers MUST implement)

```typescript
interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}
```

### Provider Implementation Template

```typescript
// src/providers/example.ts
import { LLMProvider, GenerateOptions, ProviderConfig } from './types.js';

export class ExampleProvider implements LLMProvider {
  name = 'Example';
  private client: ExampleClient;

  constructor(config: ProviderConfig) {
    this.client = new ExampleClient({ apiKey: config.apiKey });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.EXAMPLE_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.complete({
      model: options?.model || 'default-model',
      prompt,
      temperature: options?.temperature || 0.7
    });
    return response.text;
  }
}
```

### Provider Factory Usage

```typescript
// Auto-detect best available provider
const provider = await ProviderFactory.autoDetect();

// Or specify explicitly
const provider = ProviderFactory.create({
  provider: 'groq',
  apiKey: process.env.GROQ_API_KEY
});
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables/functions | camelCase | `fileName`, `parseResponse` |
| Types/interfaces | PascalCase | `TestResult`, `ExitCode` |
| Constants | UPPER_SNAKE_CASE | `EXIT_CODES`, `DEFAULT_TIMEOUT` |
| Source files | kebab-case.ts | `dependency-resolver.ts` |
| React components | PascalCase.tsx | `App.tsx` |
| Test files | *.test.ts | `parser.test.ts` |
| Agent classes | PascalCase + Agent | `AnalyzerAgent`, `WriterAgent` |
| Provider classes | PascalCase + Provider | `GroqProvider`, `OllamaProvider` |

---

## Import Organization

Always order imports:
1. Node.js built-ins (`fs`, `path`)
2. External packages (`ink`, `commander`, `groq-sdk`)
3. Internal modules (relative imports with `.js` extension)
4. Types (if separate)

```typescript
// 1. Node.js built-ins
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// 2. External packages
import { render } from 'ink';
import Groq from 'groq-sdk';

// 3. Internal modules
import { AnalyzerAgent } from './agents/analyzer.js';
import { GroqProvider } from './providers/groq.js';

// 4. Types
import type { AgentContext, AgentResult } from './agents/types.js';
```

---

## Testing Rules

### Vitest Specifics (NOT Jest)

```typescript
// Use 'vi' from Vitest, NOT 'jest'
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock example
vi.mock('./providers/groq.js');
vi.mock('./services/dependency-resolver.js');
```

### Test File Template

```typescript
// parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseCodeFromResponse } from './parser.js';

describe('parseCodeFromResponse', () => {
  it('extracts last typescript code block', () => {
    const input = '```typescript\nconst x = 1;\n```';
    expect(parseCodeFromResponse(input)).toBe('const x = 1;');
  });

  it('handles multiple code blocks (takes last)', () => {
    const input = '```typescript\nfirst\n```\n```typescript\nlast\n```';
    expect(parseCodeFromResponse(input)).toBe('last');
  });
});
```

### Required Test Cases for parser.test.ts

1. Extracts ` ```typescript ` block
2. Extracts ` ```javascript ` block
3. Extracts ` ```ts ` and ` ```js ` short forms
4. Extracts ` ``` ` block (no language tag)
5. Falls back to raw response if no block
6. Handles multiple blocks (takes last)
7. Handles empty response

---

## File Structure Reference

```
smart-test/
├── .env.example
├── .eslintrc.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
│
├── prompts/
│   ├── unit-test.md          # Test generation prompt
│   ├── fix-test.md           # Test fixing prompt
│   └── analyze-failure.md    # Failure analysis prompt
│
├── src/
│   ├── cli.ts                # Entry: Commander setup
│   ├── app.tsx               # TUI: Ink component
│   ├── types.ts              # Shared types
│   │
│   ├── commands/
│   │   ├── unit.ts           # 'unit' command
│   │   └── codebase.ts       # 'codebase' command
│   │
│   ├── agents/
│   │   ├── types.ts          # Agent interfaces
│   │   ├── orchestrator.ts   # Orchestrator agent
│   │   ├── analyzer.ts       # Analyzer agent
│   │   ├── writer.ts         # Writer agent
│   │   ├── validator.ts      # Validator agent
│   │   └── fixer.ts          # Fixer agent
│   │
│   ├── providers/
│   │   ├── types.ts          # Provider interfaces
│   │   ├── factory.ts        # Provider factory
│   │   ├── ollama.ts         # Ollama provider
│   │   ├── groq.ts           # Groq provider
│   │   ├── openai.ts         # OpenAI provider
│   │   └── anthropic.ts      # Anthropic provider
│   │
│   ├── services/
│   │   ├── dependency-resolver.ts
│   │   ├── codebase-scanner.ts
│   │   ├── test-runner.ts
│   │   ├── quality-checker.ts
│   │   ├── self-healing.ts
│   │   └── parser.ts
│   │
│   └── utils/
│       ├── file.ts
│       ├── prompt.ts
│       ├── errors.ts
│       ├── config.ts
│       └── logger.ts
│
├── tests/
│   ├── agents/*.test.ts
│   ├── providers/*.test.ts
│   └── services/*.test.ts
│
└── dist/
```

---

## Anti-Patterns (NEVER do these)

```typescript
// WRONG: Missing .js extension (ESM fails)
import { foo } from './utils/file';

// WRONG: snake_case variables
const test_result = await generate_tests(file_path);

// WRONG: non-actionable error
console.error('Something went wrong');

// WRONG: magic number exit code
process.exit(5);

// WRONG: first code block (LLMs explain first)
const match = response.match(/```.*?\n([\s\S]*?)```/);

// WRONG: using jest instead of vi
jest.mock('./providers/groq');

// WRONG: HTTP calls outside providers
// In agents/writer.ts - BAD
const response = await fetch('https://api.groq.com/...');

// WRONG: Agent not returning AgentResult
async execute(input) {
  return { code: 'test code' }; // Missing success, data structure
}
```

---

## Self-Healing Loop Rules

### Retry Behavior

```typescript
const MAX_RETRIES = 3; // Default, configurable via --max-retries

while (attempt < maxRetries) {
  const testResult = await runTests(testCode);

  if (testResult.success) {
    return { success: true, finalCode: testCode };
  }

  attempt++;
  const fixResult = await fixerAgent.execute({
    testCode,
    failures: testResult.failures,
    attempt
  }, context);

  testCode = fixResult.data.fixedCode;
}

// Max retries exceeded
return { success: false, exitCode: EXIT_TESTS_FAILED };
```

### Test Runner Integration

```typescript
// Spawn test runner subprocess
import { spawn } from 'child_process';

async function runTests(testFile: string): Promise<TestRunResult> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['vitest', 'run', testFile, '--reporter=json']);
    let output = '';

    proc.stdout.on('data', (data) => output += data);
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        failures: code === 0 ? [] : parseFailures(output)
      });
    });
  });
}
```

---

## Environment Variables

```bash
# Provider selection
SMART_TEST_PROVIDER=groq

# API Keys
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Ollama config
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=codellama

# Defaults
SMART_TEST_MAX_RETRIES=3
SMART_TEST_TIMEOUT=120
```

---

## NFR Reminders

- **< 1s startup** — minimal dependencies, lazy imports
- **120s timeout** — configurable per provider
- **Zero crashes** — wrap all async in try/catch, error boundary in app.tsx
- **Privacy** — Ollama option keeps code local
- **API key safety** — never log or display keys
- **Max 3 retries** — prevent infinite self-healing loops
- **Memory < 500MB** — stream large codebases
