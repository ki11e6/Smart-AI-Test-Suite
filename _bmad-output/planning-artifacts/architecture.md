---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
  - step-09-v2-expansion
inputDocuments:
  - prd.md (v2.0)
workflowType: 'architecture'
project_name: 'Smart AI Test Suit'
user_name: 'Pro'
date: '2026-01-17'
version: '2.0'
status: 'complete'
completedAt: '2026-01-17'
---

# Architecture Decision Document v2.0

_Comprehensive architecture for Smart AI Test Suit with agent system, multi-provider LLM, codebase analysis, and self-healing capabilities._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
84 FRs across 11 capability areas:
- Agent System (8 FRs)
- Multi-Provider LLM (10 FRs)
- Codebase Analysis (8 FRs)
- Dependency Resolution (8 FRs)
- Quality Assurance (7 FRs)
- Self-Healing (11 FRs)
- Test Generation (10 FRs)
- Output Handling (6 FRs)
- CLI Interface (7 FRs)
- User Experience (5 FRs)
- Debugging (4 FRs)

**Non-Functional Requirements:**
22 NFRs covering performance, reliability, security, usability, and scalability.

**Scale & Complexity:**
- Primary domain: CLI / Developer Tools with AI
- Complexity level: Medium
- Estimated architectural components: 15-20 modules
- Users: Single user, potentially long-running operations
- State: Minimal persistence (codebase graph cache optional)

### Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| TypeScript + Ink | Runtime: Node.js, TUI framework |
| Multiple LLM APIs | Provider abstraction required |
| Test runner integration | Spawn vitest/jest subprocess |
| ESLint integration | Programmatic API |
| AST parsing for imports | TypeScript compiler API |

### Cross-Cutting Concerns

1. **Agent Coordination:** All agents share context and communicate results
2. **LLM Abstraction:** Uniform interface across 4 providers
3. **Error Handling:** Graceful failures at every layer
4. **Progress Reporting:** Real-time status updates to TUI
5. **Self-Healing Loop:** Bounded retry with state tracking

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.x | Primary language, strict mode |
| Node.js | 20+ | Runtime (ESM) |
| Ink | 4+ | Terminal UI framework |
| React | 18+ | Component model for Ink |
| Commander | 11+ | CLI argument parsing |
| Vitest | latest | Testing framework |

### LLM Provider SDKs

| Provider | Package | Purpose |
|----------|---------|---------|
| Ollama | `ollama` | Local LLM client |
| Groq | `groq-sdk` | Groq API client |
| OpenAI | `openai` | OpenAI API client |
| Anthropic | `@anthropic-ai/sdk` | Anthropic API client |

### Quality & Analysis Tools

| Tool | Package | Purpose |
|------|---------|---------|
| ESLint | `eslint` | Lint validation |
| TypeScript | `typescript` | AST parsing, type checking |
| glob | `fast-glob` | File discovery |

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI LAYER (cli.ts)                            │
│  • Argument parsing (Commander)                                         │
│  • Command routing (unit, codebase)                                     │
│  • Environment configuration                                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                      TUI LAYER (app.tsx)                                │
│  • Progress display (Ink)                                               │
│  • Agent status visualization                                           │
│  • Error display                                                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                                   │
│  • Plans test strategy                                                  │
│  • Coordinates agent sequence                                           │
│  • Manages self-healing loop                                            │
│  • Tracks overall progress                                              │
└────────┬───────────┬───────────┬───────────┬───────────┬───────────────┘
         │           │           │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │ANALYZER │ │ WRITER  │ │VALIDATOR│ │ FIXER   │ │ RUNNER  │
    │ AGENT   │ │ AGENT   │ │ AGENT   │ │ AGENT   │ │ SERVICE │
    └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │           │           │
┌────────▼───────────▼───────────▼───────────▼───────────▼───────────────┐
│                      SERVICES LAYER                                     │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│  LLM Provider   │   Dependency    │    Quality      │    Test          │
│  Abstraction    │   Resolver      │    Checker      │    Runner        │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ • Ollama        │ • Import parser │ • ESLint        │ • Vitest spawn   │
│ • Groq          │ • Path resolver │ • Import check  │ • Jest spawn     │
│ • OpenAI        │ • Type extract  │ • Mock verify   │ • Output capture │
│ • Anthropic     │ • Graph builder │ • Type check    │ • Error parse    │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                      UTILITIES LAYER                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│    File      │    Prompt    │    Error     │   Parser     │   Config   │
│    Utils     │    Loader    │   Handler    │   (LLM)      │   Manager  │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

## Agent System Architecture

### Agent Interface

```typescript
// src/agents/types.ts

interface AgentContext {
  sourceFile: string;
  sourceCode: string;
  dependencies: DependencyInfo[];
  framework: TestFramework;
  provider: LLMProvider;
  options: GenerationOptions;
}

interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metrics?: AgentMetrics;
}

interface Agent<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
}
```

### Orchestrator Agent

**Responsibility:** Plans strategy, coordinates agents, manages self-healing loop.

```typescript
// Orchestrator flow for single file
async function orchestrateSingleFile(file: string, options: Options): Promise<Result> {
  const context = await buildContext(file, options);

  // 1. Analyze dependencies
  const analysis = await analyzerAgent.execute(file, context);

  // 2. Generate tests
  const tests = await writerAgent.execute(analysis.data, context);

  // 3. Validate quality
  const validation = await validatorAgent.execute(tests.data, context);

  // 4. Self-healing loop (if --run --fix)
  if (options.run) {
    return await selfHealingLoop(tests.data, context, options.maxRetries);
  }

  return { success: true, tests: tests.data };
}

// Orchestrator flow for codebase
async function orchestrateCodebase(dir: string, options: Options): Promise<Result> {
  // 1. Scan codebase
  const files = await analyzerAgent.scanCodebase(dir);

  // 2. Build dependency graph
  const graph = await analyzerAgent.buildDependencyGraph(files);

  // 3. Calculate optimal order (leaf nodes first)
  const order = topologicalSort(graph);

  // 4. Process each file
  const results = [];
  for (const file of order) {
    const result = await orchestrateSingleFile(file, options);
    results.push(result);
    reportProgress(file, result);
  }

  return aggregateResults(results);
}
```

### Analyzer Agent

**Responsibility:** Scans files, parses imports, builds dependency graphs.

```typescript
// src/agents/analyzer.ts

interface AnalyzerOutput {
  sourceCode: string;
  language: 'typescript' | 'javascript';
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: DependencyContext[];
  dependencyGraph?: DependencyGraph;
}

class AnalyzerAgent implements Agent<string, AnalyzerOutput> {
  name = 'Analyzer';

  async execute(filePath: string, context: AgentContext): Promise<AgentResult<AnalyzerOutput>> {
    // 1. Read source file
    const sourceCode = await readFile(filePath);

    // 2. Parse imports using TypeScript compiler API
    const imports = parseImports(sourceCode);

    // 3. Resolve import paths
    const resolvedImports = await resolveImportPaths(imports, filePath);

    // 4. Extract dependency context (types, signatures)
    const dependencies = await extractDependencyContext(resolvedImports);

    return {
      success: true,
      data: { sourceCode, language, imports, exports, dependencies }
    };
  }

  async scanCodebase(dir: string): Promise<string[]> {
    return glob(['**/*.ts', '**/*.js'], {
      cwd: dir,
      ignore: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts']
    });
  }

  async buildDependencyGraph(files: string[]): Promise<DependencyGraph> {
    const graph = new Map<string, string[]>();
    for (const file of files) {
      const imports = parseImports(await readFile(file));
      graph.set(file, imports.map(i => resolveImportPath(i, file)));
    }
    return graph;
  }
}
```

### Writer Agent

**Responsibility:** Generates test code with mocks using LLM.

```typescript
// src/agents/writer.ts

interface WriterInput {
  sourceCode: string;
  dependencies: DependencyContext[];
  framework: TestFramework;
}

interface WriterOutput {
  testCode: string;
  testCount: number;
  edgeCases: string[];
  mocks: MockInfo[];
}

class WriterAgent implements Agent<WriterInput, WriterOutput> {
  name = 'Writer';

  async execute(input: WriterInput, context: AgentContext): Promise<AgentResult<WriterOutput>> {
    // 1. Build prompt with full context
    const prompt = buildTestGenerationPrompt({
      sourceCode: input.sourceCode,
      dependencies: input.dependencies,
      framework: input.framework,
      instructions: [
        'Generate comprehensive unit tests',
        'Include 3+ edge cases (nulls, boundaries, empty states)',
        'Mock all external dependencies',
        'Use proper import paths with .js extension',
        'Follow framework-specific patterns'
      ]
    });

    // 2. Call LLM provider
    const response = await context.provider.generate(prompt);

    // 3. Parse response (extract last code block)
    const testCode = parseCodeFromResponse(response);

    // 4. Extract metadata
    const metadata = analyzeGeneratedTests(testCode);

    return {
      success: true,
      data: {
        testCode,
        testCount: metadata.testCount,
        edgeCases: metadata.edgeCases,
        mocks: metadata.mocks
      }
    };
  }
}
```

### Validator Agent

**Responsibility:** Checks lint, imports, mocks before saving.

```typescript
// src/agents/validator.ts

interface ValidatorInput {
  testCode: string;
  sourceFile: string;
  dependencies: DependencyContext[];
}

interface ValidatorOutput {
  isValid: boolean;
  lintErrors: LintError[];
  importErrors: ImportError[];
  mockIssues: MockIssue[];
  fixedCode?: string;
}

class ValidatorAgent implements Agent<ValidatorInput, ValidatorOutput> {
  name = 'Validator';

  async execute(input: ValidatorInput, context: AgentContext): Promise<AgentResult<ValidatorOutput>> {
    const issues: ValidationIssue[] = [];

    // 1. Run ESLint
    const lintResult = await runESLint(input.testCode);
    issues.push(...lintResult.errors.map(e => ({ type: 'lint', ...e })));

    // 2. Check import paths
    const importResult = await validateImports(input.testCode, input.sourceFile);
    issues.push(...importResult.errors.map(e => ({ type: 'import', ...e })));

    // 3. Verify mock completeness
    const mockResult = await verifyMocks(input.testCode, input.dependencies);
    issues.push(...mockResult.missing.map(m => ({ type: 'mock', ...m })));

    // 4. Auto-fix if possible
    let fixedCode = input.testCode;
    if (issues.length > 0) {
      fixedCode = await autoFixIssues(input.testCode, issues);
    }

    return {
      success: issues.filter(i => !i.autoFixed).length === 0,
      data: {
        isValid: issues.length === 0,
        lintErrors: issues.filter(i => i.type === 'lint'),
        importErrors: issues.filter(i => i.type === 'import'),
        mockIssues: issues.filter(i => i.type === 'mock'),
        fixedCode
      }
    };
  }
}
```

### Fixer Agent

**Responsibility:** Diagnoses test failures and generates corrections.

```typescript
// src/agents/fixer.ts

interface FixerInput {
  testCode: string;
  testOutput: TestRunOutput;
  sourceCode: string;
  attempt: number;
}

interface FixerOutput {
  fixedCode: string;
  fixesApplied: FixDescription[];
}

class FixerAgent implements Agent<FixerInput, FixerOutput> {
  name = 'Fixer';

  async execute(input: FixerInput, context: AgentContext): Promise<AgentResult<FixerOutput>> {
    // 1. Parse test failures
    const failures = parseTestFailures(input.testOutput);

    // 2. Build fix prompt
    const prompt = buildFixPrompt({
      testCode: input.testCode,
      sourceCode: input.sourceCode,
      failures: failures,
      attempt: input.attempt,
      instructions: [
        'Analyze the test failures',
        'Identify root cause for each failure',
        'Generate corrected test code',
        'Preserve passing tests unchanged',
        'Ensure mocks return correct types'
      ]
    });

    // 3. Call LLM provider
    const response = await context.provider.generate(prompt);

    // 4. Parse fixed code
    const fixedCode = parseCodeFromResponse(response);

    return {
      success: true,
      data: {
        fixedCode,
        fixesApplied: extractFixDescriptions(response)
      }
    };
  }
}
```

## LLM Provider Abstraction

### Provider Interface

```typescript
// src/providers/types.ts

interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

interface ProviderConfig {
  provider: 'ollama' | 'groq' | 'openai' | 'anthropic';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}
```

### Provider Implementations

```typescript
// src/providers/ollama.ts
class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  private client: Ollama;

  constructor(config: ProviderConfig) {
    this.client = new Ollama({ host: config.baseUrl || 'http://localhost:11434' });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.generate({
      model: options?.model || 'codellama',
      prompt,
      options: { temperature: options?.temperature || 0.7 }
    });
    return response.response;
  }
}

// src/providers/groq.ts
class GroqProvider implements LLMProvider {
  name = 'Groq';
  private client: Groq;

  constructor(config: ProviderConfig) {
    this.client = new Groq({ apiKey: config.apiKey });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7
    });
    return response.choices[0].message.content;
  }
}

// src/providers/openai.ts
class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7
    });
    return response.choices[0].message.content;
  }
}

// src/providers/anthropic.ts
class AnthropicProvider implements LLMProvider {
  name = 'Anthropic';
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options?.model || 'claude-3-opus-20240229',
      max_tokens: options?.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
  }
}
```

### Provider Factory

```typescript
// src/providers/factory.ts

class ProviderFactory {
  static create(config: ProviderConfig): LLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider(config);
      case 'groq':
        return new GroqProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  static async autoDetect(): Promise<LLMProvider> {
    // Priority: Groq > OpenAI > Anthropic > Ollama
    const providers = [
      { provider: 'groq', apiKey: process.env.GROQ_API_KEY },
      { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
      { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
      { provider: 'ollama' }
    ];

    for (const config of providers) {
      const provider = this.create(config as ProviderConfig);
      if (await provider.isAvailable()) {
        return provider;
      }
    }

    throw new Error('No LLM provider available. Set API key or start Ollama.');
  }
}
```

## Self-Healing Loop Architecture

```typescript
// src/services/self-healing.ts

interface HealingContext {
  testCode: string;
  sourceFile: string;
  sourceCode: string;
  dependencies: DependencyContext[];
  maxRetries: number;
}

async function selfHealingLoop(
  context: HealingContext,
  provider: LLMProvider
): Promise<HealingResult> {
  let currentCode = context.testCode;
  let attempt = 0;
  const history: HealingAttempt[] = [];

  while (attempt < context.maxRetries) {
    // 1. Run tests
    const testResult = await runTests(currentCode, context.sourceFile);

    if (testResult.success) {
      return {
        success: true,
        finalCode: currentCode,
        attempts: attempt,
        history
      };
    }

    attempt++;
    reportProgress(`Attempt ${attempt}/${context.maxRetries}: Fixing ${testResult.failures.length} failures`);

    // 2. Call Fixer Agent
    const fixResult = await fixerAgent.execute({
      testCode: currentCode,
      testOutput: testResult,
      sourceCode: context.sourceCode,
      attempt
    }, { provider });

    if (!fixResult.success) {
      history.push({ attempt, error: fixResult.error });
      continue;
    }

    history.push({
      attempt,
      failures: testResult.failures,
      fixes: fixResult.data.fixesApplied
    });

    currentCode = fixResult.data.fixedCode;
  }

  // Max retries exceeded
  return {
    success: false,
    finalCode: currentCode,
    attempts: attempt,
    history,
    remainingFailures: await runTests(currentCode, context.sourceFile).failures
  };
}
```

## Dependency Resolution Architecture

```typescript
// src/services/dependency-resolver.ts

interface DependencyContext {
  path: string;
  isExternal: boolean;
  exports: ExportInfo[];
  types: TypeInfo[];
  functionSignatures: FunctionSignature[];
}

class DependencyResolver {
  private cache = new Map<string, DependencyContext>();

  async resolve(filePath: string): Promise<DependencyContext[]> {
    const sourceCode = await readFile(filePath);
    const imports = this.parseImports(sourceCode);
    const contexts: DependencyContext[] = [];

    for (const imp of imports) {
      if (this.cache.has(imp.path)) {
        contexts.push(this.cache.get(imp.path)!);
        continue;
      }

      const context = await this.analyzeImport(imp, filePath);
      this.cache.set(imp.path, context);
      contexts.push(context);
    }

    return contexts;
  }

  private parseImports(code: string): ImportInfo[] {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: ImportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        imports.push({
          path: moduleSpecifier.text,
          specifiers: this.extractSpecifiers(node)
        });
      }
    });

    return imports;
  }

  private async analyzeImport(
    imp: ImportInfo,
    fromFile: string
  ): Promise<DependencyContext> {
    // Check if external package
    if (!imp.path.startsWith('.') && !imp.path.startsWith('/')) {
      return {
        path: imp.path,
        isExternal: true,
        exports: [],
        types: [],
        functionSignatures: this.getExternalPackageTypes(imp.path)
      };
    }

    // Resolve relative path
    const resolvedPath = this.resolvePath(imp.path, fromFile);
    const code = await readFile(resolvedPath);

    return {
      path: resolvedPath,
      isExternal: false,
      exports: this.extractExports(code),
      types: this.extractTypes(code),
      functionSignatures: this.extractFunctionSignatures(code)
    };
  }
}
```

## Project Structure

```
smart-test/
├── .env.example                    # Environment template
├── .eslintrc.js                    # ESLint configuration
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
│
├── prompts/                        # LLM prompt templates
│   ├── unit-test.md                # Test generation prompt
│   ├── fix-test.md                 # Test fixing prompt
│   └── analyze-failure.md          # Failure analysis prompt
│
├── src/
│   ├── cli.ts                      # CLI entry point
│   ├── app.tsx                     # Ink TUI component
│   ├── types.ts                    # Shared type definitions
│   │
│   ├── commands/
│   │   ├── unit.ts                 # 'unit' command handler
│   │   └── codebase.ts             # 'codebase' command handler
│   │
│   ├── agents/
│   │   ├── types.ts                # Agent interfaces
│   │   ├── orchestrator.ts         # Orchestrator agent
│   │   ├── analyzer.ts             # Analyzer agent
│   │   ├── writer.ts               # Writer agent
│   │   ├── validator.ts            # Validator agent
│   │   └── fixer.ts                # Fixer agent
│   │
│   ├── providers/
│   │   ├── types.ts                # Provider interfaces
│   │   ├── factory.ts              # Provider factory
│   │   ├── ollama.ts               # Ollama provider
│   │   ├── groq.ts                 # Groq provider
│   │   ├── openai.ts               # OpenAI provider
│   │   └── anthropic.ts            # Anthropic provider
│   │
│   ├── services/
│   │   ├── dependency-resolver.ts  # Import analysis
│   │   ├── codebase-scanner.ts     # Directory scanning
│   │   ├── test-runner.ts          # Test execution
│   │   ├── quality-checker.ts      # Lint & validation
│   │   ├── self-healing.ts         # Self-healing loop
│   │   └── parser.ts               # LLM response parser
│   │
│   └── utils/
│       ├── file.ts                 # File operations
│       ├── prompt.ts               # Prompt loading
│       ├── errors.ts               # Error handling
│       ├── config.ts               # Configuration
│       └── logger.ts               # Logging utilities
│
├── tests/
│   ├── agents/
│   │   └── *.test.ts
│   ├── providers/
│   │   └── *.test.ts
│   └── services/
│       └── *.test.ts
│
└── dist/                           # Compiled output
```

## Implementation Patterns

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables/functions | camelCase | `parseImports`, `testRunner` |
| Types/interfaces | PascalCase | `AgentResult`, `LLMProvider` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Files | kebab-case.ts | `dependency-resolver.ts` |
| Agents | PascalCase + Agent | `AnalyzerAgent`, `WriterAgent` |
| Providers | PascalCase + Provider | `GroqProvider`, `OllamaProvider` |

### Error Handling

**Exit Codes:**
| Code | Constant | Meaning |
|------|----------|---------|
| 0 | EXIT_SUCCESS | All operations successful |
| 1 | EXIT_GENERAL_ERROR | Unexpected error |
| 2 | EXIT_FILE_NOT_FOUND | Source file not found |
| 3 | EXIT_PROVIDER_ERROR | LLM provider connection failed |
| 4 | EXIT_TIMEOUT | Operation timed out |
| 5 | EXIT_INVALID_RESPONSE | LLM response unusable |
| 6 | EXIT_TESTS_FAILED | Tests failed after max retries |
| 7 | EXIT_LINT_ERROR | Unfixable lint errors |

**Error Message Format:**
```
Error: [E0XX] Short description. Suggested fix.
```

### LLM Response Parsing

```typescript
// Always extract LAST code block (LLMs explain first, give final code last)
function parseCodeFromResponse(response: string): string {
  const blocks = [...response.matchAll(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/g)];

  if (blocks.length > 0) {
    return blocks[blocks.length - 1][1].trim();
  }

  // Fallback: return trimmed response
  return response.trim();
}
```

### ESM Import Rules

```typescript
// CORRECT: Use .js extension even for TypeScript files
import { parseImports } from './services/dependency-resolver.js';
import { AnalyzerAgent } from './agents/analyzer.js';

// WRONG: Missing .js extension (runtime error in ESM)
import { parseImports } from './services/dependency-resolver';
```

### Agent Communication Pattern

```typescript
// Agents receive full context and return structured results
const analyzerResult = await analyzerAgent.execute(filePath, context);

if (!analyzerResult.success) {
  return handleError(analyzerResult.error);
}

// Pass data to next agent
const writerResult = await writerAgent.execute(analyzerResult.data, context);
```

## Data Flow

### Single File Flow

```
User Input: smart-test unit ./src/utils.ts --run --fix
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ CLI (cli.ts)                                            │
│ • Parse arguments                                       │
│ • Load configuration                                    │
│ • Initialize provider                                   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Orchestrator Agent                                      │
│ • Build context                                         │
│ • Coordinate agents                                     │
└─────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Analyzer Agent  │ │ Writer Agent    │ │ Validator Agent │
│ • Parse imports │ │ • Build prompt  │ │ • Run ESLint    │
│ • Resolve deps  │ │ • Call LLM      │ │ • Check imports │
│ • Build context │ │ • Parse tests   │ │ • Verify mocks  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Self-Healing Loop (if --run --fix)                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Test Runner → Fixer Agent → Test Runner → ...       │ │
│ │ (max 3 retries)                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Output                                                  │
│ • Write test file                                       │
│ • Display summary                                       │
│ • Exit with code                                        │
└─────────────────────────────────────────────────────────┘
```

### Codebase Flow

```
User Input: smart-test codebase ./src --run --fix
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Codebase Scanner                                        │
│ • Find all source files                                 │
│ • Build dependency graph                                │
│ • Calculate processing order                            │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Batch Processor                                         │
│ For each file (in dependency order):                    │
│   → Run single file flow                                │
│   → Track progress                                      │
│   → Aggregate results                                   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Aggregate Report                                        │
│ • Total files processed                                 │
│ • Total tests generated                                 │
│ • Self-healing statistics                               │
│ • Failed files (if any)                                 │
└─────────────────────────────────────────────────────────┘
```

## Validation Summary

### Architecture Completeness

**✅ Agent System**
- [x] 5 specialized agents defined
- [x] Agent interface specified
- [x] Orchestration pattern documented
- [x] Communication protocol defined

**✅ Multi-Provider LLM**
- [x] 4 providers supported
- [x] Unified interface defined
- [x] Factory pattern for instantiation
- [x] Auto-detection mechanism

**✅ Self-Healing Loop**
- [x] Retry mechanism with max limit
- [x] Failure parsing defined
- [x] Fixer agent integration
- [x] Progress reporting

**✅ Codebase Analysis**
- [x] File discovery pattern
- [x] Dependency graph building
- [x] Topological sort for ordering
- [x] Batch processing flow

**✅ Quality Assurance**
- [x] ESLint integration
- [x] Import validation
- [x] Mock verification
- [x] Auto-fix capabilities

### Requirements Coverage

| Category | FRs | Covered |
|----------|-----|---------|
| FR-AGENT | 8 | ✅ 8/8 |
| FR-LLM | 10 | ✅ 10/10 |
| FR-SCAN | 8 | ✅ 8/8 |
| FR-DEP | 8 | ✅ 8/8 |
| FR-QA | 7 | ✅ 7/7 |
| FR-HEAL | 11 | ✅ 11/11 |
| FR-GEN | 10 | ✅ 10/10 |
| FR-OUT | 6 | ✅ 6/6 |
| FR-CLI | 7 | ✅ 7/7 |
| FR-UX | 5 | ✅ 5/5 |
| FR-DEBUG | 4 | ✅ 4/4 |
| **Total** | **84** | **✅ 84/84** |

### Implementation Priority

1. **Phase 1: Foundation**
   - Project setup with all dependencies
   - Provider abstraction and implementations
   - Basic agent interfaces

2. **Phase 2: Core Agents**
   - Analyzer Agent (dependency resolution)
   - Writer Agent (test generation)
   - Orchestrator for single file

3. **Phase 3: Quality & Healing**
   - Validator Agent
   - Fixer Agent
   - Self-healing loop

4. **Phase 4: Codebase Support**
   - Codebase scanner
   - Dependency graph
   - Batch processing

5. **Phase 5: Polish**
   - TUI improvements
   - Error handling refinement
   - Documentation

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Document Version:** 2.0
**Last Updated:** 2026-01-17
