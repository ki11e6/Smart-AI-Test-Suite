---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
  - step-05-v2-expansion
inputDocuments:
  - prd.md (v2.0)
  - architecture.md (v2.0)
  - project-context.md
workflowType: 'epics-and-stories'
project_name: 'Smart AI Test Suit'
user_name: 'Pro'
date: '2026-01-17'
version: '2.0'
status: 'complete'
completedAt: '2026-01-17'
epicCount: 9
storyCount: 52
frCoverage: '84/84 (100%)'
---

# Smart AI Test Suit v2.0 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Smart AI Test Suit v2.0, decomposing 84 functional requirements into implementable stories across 9 epics.

## Epic Summary

| # | Epic | Stories | FRs | Priority |
|---|------|---------|-----|----------|
| 1 | Project Foundation | 5 | 12 | P0 - Must Have |
| 2 | LLM Provider System | 6 | 10 | P0 - Must Have |
| 3 | Agent System Core | 8 | 8 | P0 - Must Have |
| 4 | Dependency Resolution | 5 | 8 | P0 - Must Have |
| 5 | Test Generation | 6 | 10 | P0 - Must Have |
| 6 | Quality Assurance | 5 | 7 | P1 - High |
| 7 | Self-Healing Loop | 6 | 11 | P1 - High |
| 8 | Codebase Analysis | 5 | 8 | P1 - High |
| 9 | User Experience & Debug | 6 | 10 | P2 - Medium |

**Total: 9 Epics, 52 Stories, 84 FRs**

## Implementation Phases

```
Phase 1: Foundation (Epics 1-2)
├── Project setup, types, utilities
├── LLM provider abstraction
└── All 4 providers implemented

Phase 2: Core Agents (Epics 3-5)
├── Agent interfaces and orchestrator
├── Analyzer, Writer agents
├── Dependency resolution
└── Basic test generation working

Phase 3: Quality & Healing (Epics 6-7)
├── Validator agent (lint, imports, mocks)
├── Fixer agent
├── Self-healing loop
└── Test runner integration

Phase 4: Codebase & Polish (Epics 8-9)
├── Codebase scanner
├── Batch processing
├── TUI improvements
└── Debug features
```

---

## Epic 1: Project Foundation

**Goal:** Establish the project structure, shared types, and core utilities.

**Done When:** Project builds, types are defined, utilities work, basic CLI runs.

**FRs Covered:** FR-CLI-01 through FR-CLI-07, FR-GEN-03, FR-OUT-01 through FR-OUT-06

### Story 1.1: Initialize Project Structure

As a **developer**,
I want **the project scaffolded with all dependencies**,
So that **I have a working foundation to build upon**.

**Acceptance Criteria:**

```bash
# Project initialization
npx create-ink-app --typescript smart-test
cd smart-test

# Core dependencies
npm install commander ollama groq-sdk openai @anthropic-ai/sdk

# Quality & analysis
npm install eslint fast-glob typescript

# Dev dependencies
npm install -D vitest @types/node
```

**Given** the project is initialized
**Then** the directory structure matches architecture spec
**And** `npm run build` succeeds
**And** `npm link` makes `smart-test` available

### Story 1.2: Define Shared Types

As a **developer**,
I want **shared TypeScript types defined centrally**,
So that **all modules use consistent type definitions**.

**Acceptance Criteria:**

**Given** the types module (`src/types.ts`)
**When** other modules need type definitions
**Then** types are available for:
  - `ExitCode` (0-7)
  - `TestFramework` ('vitest' | 'jest' | 'mocha')
  - `ProviderType` ('ollama' | 'groq' | 'openai' | 'anthropic')
  - `GenerationOptions`
  - `TestResult`
  - `ValidationResult`

### Story 1.3: Implement Error Handling Utilities

As a **developer**,
I want **consistent error handling with semantic exit codes**,
So that **all errors are actionable and the tool never crashes unexpectedly**.

**Acceptance Criteria:**

**Given** the error utilities (`src/utils/errors.ts`)
**When** an error occurs
**Then** it's formatted as `Error: [E0XX] Description. Fix.`
**And** appropriate exit code (0-7) is used

**Exit Codes:**
| Code | Constant | Meaning |
|------|----------|---------|
| 0 | EXIT_SUCCESS | Success |
| 1 | EXIT_GENERAL_ERROR | General error |
| 2 | EXIT_FILE_NOT_FOUND | File not found |
| 3 | EXIT_PROVIDER_ERROR | LLM connection failed |
| 4 | EXIT_TIMEOUT | Timeout |
| 5 | EXIT_INVALID_RESPONSE | Invalid LLM response |
| 6 | EXIT_TESTS_FAILED | Tests failed after retries |
| 7 | EXIT_LINT_ERROR | Unfixable lint errors |

### Story 1.4: Implement File Utilities

As a **user**,
I want **the tool to read and write files correctly**,
So that **my source code is analyzed and tests are saved**.

**Acceptance Criteria:**

**Given** a valid file path
**When** `readFile(path)` is called
**Then** file content is returned as string
**And** language is detected from extension

**Given** a non-existent path
**When** `readFile(path)` is called
**Then** exit code 2 with message: `Error: [E002] File not found: <path>. Check the path.`

**Given** test content to write
**When** `writeFile(path, content)` is called
**Then** file is created/overwritten
**And** parent directories are created if needed

### Story 1.5: Implement CLI Entry Point

As a **user**,
I want **to run `smart-test --help` and see usage**,
So that **I understand how to use the tool**.

**Acceptance Criteria:**

**Given** the CLI entry point (`src/cli.ts`)
**When** `smart-test --help` runs
**Then** shows:
```
Usage: smart-test <command> [options]

Commands:
  unit <file>          Generate tests for a single file
  codebase <dir>       Generate tests for entire codebase

Options:
  --provider <name>    LLM provider (ollama|groq|openai|anthropic)
  --model <name>       Model to use
  --run                Run tests after generation
  --fix                Auto-fix failing tests (requires --run)
  --max-retries <n>    Max fix attempts (default: 3)
  --output <path>      Output path
  --format <type>      Output format (file|stdout)
  --verbose            Show debug output
  --help               Show help
```

---

## Epic 2: LLM Provider System

**Goal:** Implement provider abstraction supporting Ollama, Groq, OpenAI, and Anthropic.

**Done When:** All 4 providers work, auto-detection works, provider switching works.

**FRs Covered:** FR-LLM-01 through FR-LLM-10

### Story 2.1: Define Provider Interface

As a **developer**,
I want **a unified LLM provider interface**,
So that **providers can be swapped without code changes**.

**Acceptance Criteria:**

**Given** `src/providers/types.ts`
**Then** defines:
```typescript
interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}
```

### Story 2.2: Implement Ollama Provider

As a **user**,
I want **to use local Ollama for test generation**,
So that **my code stays private and I pay nothing**.

**Acceptance Criteria:**

**Given** Ollama running on localhost:11434
**When** `--provider ollama` is used
**Then** tests are generated using Ollama

**Given** Ollama not running
**When** provider is initialized
**Then** `isAvailable()` returns false
**And** error: `Error: [E003] Ollama not available. Run 'ollama serve'.`

**Given** `--model codellama` flag
**When** generation runs
**Then** specified model is used

### Story 2.3: Implement Groq Provider

As a **user**,
I want **to use Groq's fast cloud inference**,
So that **I get quick test generation**.

**Acceptance Criteria:**

**Given** `GROQ_API_KEY` environment variable set
**When** `--provider groq` is used
**Then** tests generated via Groq API

**Given** no API key
**When** provider initialized
**Then** `isAvailable()` returns false

**Default model:** `llama-3.1-70b-versatile`

### Story 2.4: Implement OpenAI Provider

As a **user**,
I want **to use OpenAI GPT-4 for test generation**,
So that **I get high-quality output**.

**Acceptance Criteria:**

**Given** `OPENAI_API_KEY` set
**When** `--provider openai` used
**Then** tests generated via OpenAI

**Default model:** `gpt-4`

### Story 2.5: Implement Anthropic Provider

As a **user**,
I want **to use Anthropic Claude for test generation**,
So that **I have provider choice**.

**Acceptance Criteria:**

**Given** `ANTHROPIC_API_KEY` set
**When** `--provider anthropic` used
**Then** tests generated via Anthropic

**Default model:** `claude-3-opus-20240229`

### Story 2.6: Implement Provider Factory & Auto-Detection

As a **user**,
I want **providers auto-detected based on available keys**,
So that **I don't need to specify --provider every time**.

**Acceptance Criteria:**

**Given** no `--provider` flag
**When** CLI runs
**Then** providers checked in order: Groq → OpenAI → Anthropic → Ollama
**And** first available provider used

**Given** `--provider groq` specified
**When** provider created
**Then** Groq used regardless of other keys

**Given** no providers available
**When** CLI runs
**Then** `Error: [E003] No LLM provider available. Set API key or start Ollama.`

---

## Epic 3: Agent System Core

**Goal:** Implement the agent interfaces, orchestrator, and base agent functionality.

**Done When:** Orchestrator coordinates agents, agent communication works.

**FRs Covered:** FR-AGENT-01 through FR-AGENT-08

### Story 3.1: Define Agent Interfaces

As a **developer**,
I want **standardized agent interfaces**,
So that **all agents follow the same patterns**.

**Acceptance Criteria:**

**Given** `src/agents/types.ts`
**Then** defines:
```typescript
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

### Story 3.2: Implement Orchestrator Agent

As a **system**,
I want **an orchestrator to coordinate all agents**,
So that **the test generation pipeline runs smoothly**.

**Acceptance Criteria:**

**Given** `src/agents/orchestrator.ts`
**When** single file mode
**Then** coordinates: Analyzer → Writer → Validator → (optional) Self-Healing

**When** codebase mode
**Then** coordinates: Scanner → Graph Builder → Batch Processor

### Story 3.3: Implement Analyzer Agent

As a **system**,
I want **an analyzer to understand source files**,
So that **we have full context for test generation**.

**Acceptance Criteria:**

**Given** a source file path
**When** Analyzer executes
**Then** returns:
  - `sourceCode`: File content
  - `language`: 'typescript' | 'javascript'
  - `imports`: Parsed import statements
  - `exports`: Exported functions/classes
  - `dependencies`: Resolved dependency context

### Story 3.4: Implement Writer Agent

As a **system**,
I want **a writer agent to generate tests**,
So that **LLM produces quality test code**.

**Acceptance Criteria:**

**Given** source code and dependency context
**When** Writer executes
**Then** calls LLM with:
  - Full source code
  - Dependency context (types, signatures)
  - Framework-specific instructions
  - Edge case requirements
**And** returns parsed test code

### Story 3.5: Implement Validator Agent

As a **system**,
I want **a validator to check test quality**,
So that **generated tests have no issues**.

**Acceptance Criteria:**

**Given** generated test code
**When** Validator executes
**Then** checks:
  - ESLint passes
  - All imports resolve
  - All dependencies mocked
**And** auto-fixes where possible
**And** returns validation result

### Story 3.6: Implement Fixer Agent

As a **system**,
I want **a fixer agent to correct failing tests**,
So that **self-healing can work**.

**Acceptance Criteria:**

**Given** failing test output and original code
**When** Fixer executes
**Then** analyzes failures
**And** generates corrected test code
**And** returns fixes applied

### Story 3.7: Implement Agent Communication

As a **developer**,
I want **agents to share context seamlessly**,
So that **data flows through the pipeline**.

**Acceptance Criteria:**

**Given** Analyzer output
**When** passed to Writer
**Then** all context available

**Given** validation failures
**When** Fixer receives context
**Then** has access to:
  - Original test code
  - Source code
  - Failure messages
  - Attempt number

### Story 3.8: Implement Agent Metrics

As a **user**,
I want **to see agent execution metrics**,
So that **I understand what happened**.

**Acceptance Criteria:**

**Given** agent execution
**When** complete
**Then** metrics include:
  - Execution time
  - LLM tokens used
  - Success/failure status

---

## Epic 4: Dependency Resolution

**Goal:** Parse imports, resolve paths, extract types and signatures from dependencies.

**Done When:** Full dependency context built for any file.

**FRs Covered:** FR-DEP-01 through FR-DEP-08

### Story 4.1: Implement Import Parser

As a **system**,
I want **to parse import statements from source files**,
So that **we know what dependencies exist**.

**Acceptance Criteria:**

**Given** TypeScript/JavaScript source code
**When** imports parsed
**Then** extracts:
  - Import path (relative or package)
  - Named imports
  - Default imports
  - Namespace imports

**Example:**
```typescript
// Input
import { foo, bar } from './utils.js';
import axios from 'axios';
import * as fs from 'fs';

// Output
[
  { path: './utils.js', named: ['foo', 'bar'], default: null },
  { path: 'axios', named: [], default: 'axios' },
  { path: 'fs', named: [], namespace: 'fs' }
]
```

### Story 4.2: Implement Path Resolver

As a **system**,
I want **to resolve import paths to actual files**,
So that **we can analyze dependency contents**.

**Acceptance Criteria:**

**Given** relative import `./utils.js`
**When** resolved from `/src/services/api.ts`
**Then** returns `/src/services/utils.ts`

**Given** package import `axios`
**When** resolved
**Then** marked as external (no file to analyze)

### Story 4.3: Implement Type Extractor

As a **system**,
I want **to extract types and interfaces from dependencies**,
So that **LLM knows what types to use in tests**.

**Acceptance Criteria:**

**Given** a TypeScript file
**When** types extracted
**Then** returns:
  - Interface definitions
  - Type aliases
  - Enum values
  - Function return types

### Story 4.4: Implement Signature Extractor

As a **system**,
I want **to extract function signatures from dependencies**,
So that **LLM knows how to mock them**.

**Acceptance Criteria:**

**Given** a file with functions
**When** signatures extracted
**Then** returns:
  - Function name
  - Parameter types
  - Return type
  - Async/sync

**Example output:**
```typescript
{
  name: 'fetchUser',
  params: [{ name: 'id', type: 'string' }],
  returnType: 'Promise<User>',
  async: true
}
```

### Story 4.5: Implement Circular Dependency Handler

As a **system**,
I want **circular dependencies handled gracefully**,
So that **analysis doesn't infinite loop**.

**Acceptance Criteria:**

**Given** files A imports B, B imports A
**When** dependency resolved
**Then** cycle detected and broken
**And** both files analyzed once

---

## Epic 5: Test Generation

**Goal:** Generate quality unit tests with proper mocks and edge cases.

**Done When:** Tests generated with 3+ edge cases, proper mocks, correct imports.

**FRs Covered:** FR-GEN-01 through FR-GEN-10

### Story 5.1: Implement Prompt Template System

As a **developer**,
I want **prompts stored as editable markdown files**,
So that **contributors can improve prompts easily**.

**Acceptance Criteria:**

**Given** `prompts/unit-test.md`
**When** loaded
**Then** placeholders replaced:
  - `{{source_code}}`
  - `{{dependencies}}`
  - `{{framework}}`
  - `{{instructions}}`

### Story 5.2: Implement Test Generation Prompt

As a **system**,
I want **a comprehensive test generation prompt**,
So that **LLM produces quality tests**.

**Acceptance Criteria:**

**Given** source code and context
**When** prompt constructed
**Then** includes:
  - Full source code
  - Dependency types and signatures
  - Framework (vitest/jest) specific patterns
  - Edge case instructions
  - Mock generation instructions
  - Import path requirements (.js extension)

### Story 5.3: Implement Response Parser

As a **system**,
I want **test code extracted from LLM responses**,
So that **we get clean test code**.

**Acceptance Criteria:**

**Given** LLM response with code blocks
**When** parsed
**Then** extracts LAST code block (not first)

**Given** response without code blocks
**When** parsed
**Then** returns trimmed response as fallback

**Given** empty response
**When** parsed
**Then** returns error (exit code 5)

### Story 5.4: Implement Framework Detection

As a **system**,
I want **test framework auto-detected from package.json**,
So that **tests use correct syntax**.

**Acceptance Criteria:**

**Given** `vitest` in package.json
**When** detected
**Then** returns 'vitest'

**Given** `jest` in package.json
**When** detected
**Then** returns 'jest'

**Given** no framework found
**When** detected
**Then** returns 'vitest' as default

**Given** `--framework jest` flag
**When** used
**Then** overrides detection

### Story 5.5: Implement Mock Generation Instructions

As a **system**,
I want **mocks generated for all dependencies**,
So that **tests are isolated and don't make real calls**.

**Acceptance Criteria:**

**Given** dependency list
**When** mock instructions built
**Then** includes:
  - `vi.mock()` or `jest.mock()` calls
  - Typed mock setup
  - Return value suggestions

**Example output:**
```typescript
vi.mock('./api/client.js');
vi.mock('axios');

const mockFetchUser = vi.mocked(fetchUser);
mockFetchUser.mockResolvedValue({ id: '1', name: 'Test' });
```

### Story 5.6: Implement Edge Case Generation

As a **system**,
I want **3+ edge cases generated per file**,
So that **tests catch real bugs**.

**Acceptance Criteria:**

**Given** source code analysis
**When** edge cases identified
**Then** includes tests for:
  - Null/undefined inputs
  - Empty arrays/objects
  - Boundary values
  - Error conditions
  - Async rejections

---

## Epic 6: Quality Assurance

**Goal:** Validate generated tests for lint compliance, import correctness, and mock completeness.

**Done When:** Tests pass ESLint, imports resolve, mocks are complete.

**FRs Covered:** FR-QA-01 through FR-QA-07

### Story 6.1: Implement ESLint Integration

As a **system**,
I want **generated tests linted before saving**,
So that **code style is consistent**.

**Acceptance Criteria:**

**Given** generated test code
**When** ESLint runs
**Then** errors collected
**And** auto-fixable errors fixed
**And** remaining errors reported

### Story 6.2: Implement Import Validator

As a **system**,
I want **import paths validated**,
So that **tests don't have broken imports**.

**Acceptance Criteria:**

**Given** test code with imports
**When** validated
**Then** checks:
  - Relative paths resolve to actual files
  - .js extension present (ESM requirement)
  - Package imports are valid

### Story 6.3: Implement Mock Verifier

As a **system**,
I want **mock completeness verified**,
So that **no real dependencies are called**.

**Acceptance Criteria:**

**Given** test code and dependency list
**When** verified
**Then** reports:
  - Missing mocks
  - Incomplete mock setup
  - Type mismatches in mock returns

### Story 6.4: Implement Auto-Fixer

As a **system**,
I want **common issues auto-fixed**,
So that **manual intervention is minimized**.

**Acceptance Criteria:**

**Given** validation issues
**When** auto-fix runs
**Then** fixes:
  - Missing .js extensions
  - Simple lint errors
  - Missing mock declarations

### Story 6.5: Implement Quality Report

As a **user**,
I want **to see quality issues clearly**,
So that **I know what to fix manually**.

**Acceptance Criteria:**

**Given** validation complete
**When** issues exist
**Then** report shows:
```
⚠ Quality Issues:
  - [LINT] Line 15: Unexpected any type
  - [IMPORT] Missing: ./utils.js
  - [MOCK] Not mocked: axios
```

---

## Epic 7: Self-Healing Loop

**Goal:** Run tests, detect failures, auto-fix, and retry until passing.

**Done When:** Tests run, failures captured, fixes generated, retries bounded.

**FRs Covered:** FR-HEAL-01 through FR-HEAL-11

### Story 7.1: Implement Test Runner

As a **system**,
I want **to execute generated tests**,
So that **we know if they pass**.

**Acceptance Criteria:**

**Given** test file path
**When** runner executes
**Then** spawns vitest/jest subprocess
**And** captures stdout/stderr
**And** returns pass/fail status

### Story 7.2: Implement Failure Parser

As a **system**,
I want **test failures parsed into structured data**,
So that **Fixer agent understands what broke**.

**Acceptance Criteria:**

**Given** test runner output
**When** parsed
**Then** extracts:
  - Test name
  - Error type
  - Error message
  - Stack trace
  - Line numbers

### Story 7.3: Implement Fix Prompt

As a **system**,
I want **a prompt that helps LLM fix failures**,
So that **corrections are accurate**.

**Acceptance Criteria:**

**Given** `prompts/fix-test.md`
**When** constructed
**Then** includes:
  - Original test code
  - Source code under test
  - Failure messages
  - Attempt number
  - Previous fix history

### Story 7.4: Implement Retry Loop

As a **system**,
I want **bounded retry attempts**,
So that **we don't loop forever**.

**Acceptance Criteria:**

**Given** test failures
**When** fix loop starts
**Then** retries up to `maxRetries` (default: 3)

**Given** all tests pass
**When** loop checks
**Then** exits with success

**Given** max retries exceeded
**When** tests still fail
**Then** exits with code 6
**And** reports remaining failures

### Story 7.5: Implement Fix History

As a **system**,
I want **fix attempts tracked**,
So that **LLM doesn't repeat failed fixes**.

**Acceptance Criteria:**

**Given** multiple fix attempts
**When** history tracked
**Then** includes:
  - Attempt number
  - Failures at that attempt
  - Fixes applied
  - Success/failure result

### Story 7.6: Implement Healing Progress

As a **user**,
I want **to see self-healing progress**,
So that **I know what's happening**.

**Acceptance Criteria:**

**Given** self-healing running
**When** display updates
**Then** shows:
```
▶️  Running tests...
   ✗ 3 tests failed

🔧 Attempt 1/3: Analyzing failures...
   → TypeError in test 'handles null input'
   → Mock missing in test 'calls API'
   → Generating fixes...

▶️  Retry 1/3...
   ✗ 1 test failed

🔧 Attempt 2/3: Analyzing failures...
   → Generating fixes...

▶️  Retry 2/3...
   ✓ All tests passing!
```

---

## Epic 8: Codebase Analysis

**Goal:** Scan entire codebase, build dependency graph, process files in order.

**Done When:** Full codebase tested with proper dependency ordering.

**FRs Covered:** FR-SCAN-01 through FR-SCAN-08

### Story 8.1: Implement File Scanner

As a **system**,
I want **to discover all source files in a directory**,
So that **we know what to test**.

**Acceptance Criteria:**

**Given** a directory path
**When** scanned
**Then** finds all `.ts` and `.js` files
**And** excludes: `node_modules/`, `dist/`, `*.test.ts`, `*.spec.ts`

### Story 8.2: Implement Test Coverage Detector

As a **system**,
I want **to identify files without tests**,
So that **we only generate what's needed**.

**Acceptance Criteria:**

**Given** source file list
**When** analyzed
**Then** identifies files without corresponding `.test.ts`

### Story 8.3: Implement Dependency Graph Builder

As a **system**,
I want **a full dependency graph for the codebase**,
So that **we process files in correct order**.

**Acceptance Criteria:**

**Given** all source files
**When** graph built
**Then** maps: `file → [imported files]`

**Example:**
```
src/app.ts → [src/utils.ts, src/api.ts]
src/api.ts → [src/utils.ts]
src/utils.ts → []
```

### Story 8.4: Implement Topological Sort

As a **system**,
I want **files sorted by dependency order**,
So that **leaf nodes are tested first**.

**Acceptance Criteria:**

**Given** dependency graph
**When** sorted
**Then** order is: leaves → dependents

**Example:** `utils.ts` → `api.ts` → `app.ts`

### Story 8.5: Implement Batch Processor

As a **system**,
I want **files processed in batch with progress tracking**,
So that **full codebase is tested efficiently**.

**Acceptance Criteria:**

**Given** sorted file list
**When** batch runs
**Then** each file:
  - Analyzed
  - Tests generated
  - Validated
  - (Optional) Self-healed

**And** progress shown: `[15/47] Processing src/api.ts...`

---

## Epic 9: User Experience & Debug

**Goal:** Polish TUI, add debug features, complete CLI experience.

**Done When:** Professional TUI, verbose mode works, contributor features complete.

**FRs Covered:** FR-UX-01 through FR-UX-05, FR-DEBUG-01 through FR-DEBUG-04, FR-OUT-02

### Story 9.1: Implement TUI Progress Display

As a **user**,
I want **to see progress during generation**,
So that **I know the tool is working**.

**Acceptance Criteria:**

**Given** Ink TUI component
**When** generation runs
**Then** displays:
  - Current agent name + icon
  - Current file being processed
  - Spinner during LLM calls
  - Progress bar for codebase mode

### Story 9.2: Implement Agent Status Display

As a **user**,
I want **to see which agent is active**,
So that **I understand the process**.

**Acceptance Criteria:**

**Given** agent running
**When** display updates
**Then** shows:
```
🔍 Analyzer: Scanning utils.ts...
✍️  Writer: Generating 12 tests...
🧪 Validator: Checking quality...
🔧 Fixer: Fixing 2 failures...
```

### Story 9.3: Implement Generation Summary

As a **user**,
I want **a clear summary after generation**,
So that **I know what was created**.

**Acceptance Criteria:**

**Given** generation complete
**When** summary shown
**Then** displays:
```
✅ Generated tests for ./src/utils.ts
   → Output: ./src/utils.test.ts
   → Tests: 12 (5 edge cases)
   → Self-healed: 2 fixes applied
   → Time: 15.3s
```

### Story 9.4: Implement Verbose Mode

As a **user**,
I want **to see debug output with --verbose**,
So that **I can troubleshoot issues**.

**Acceptance Criteria:**

**Given** `--verbose` flag
**When** running
**Then** shows:
  - Full prompt sent to LLM
  - Raw LLM response
  - Dependency resolution details
  - Validation details

### Story 9.5: Implement Prompt-Only Mode

As a **contributor**,
I want **to output only the prompt without LLM call**,
So that **I can iterate on prompts quickly**.

**Acceptance Criteria:**

**Given** `--prompt-only` flag
**When** running
**Then** outputs constructed prompt to stdout
**And** no LLM call made

### Story 9.6: Implement Stdout Output

As a **user**,
I want **to output tests to stdout**,
So that **I can pipe to other tools**.

**Acceptance Criteria:**

**Given** `--format stdout`
**When** generation complete
**Then** test code printed to stdout only
**And** no file written
**And** no status messages in output (clean for piping)

---

## Validation Summary

### FR Coverage Matrix

| FR Category | Count | Covered | Epics |
|-------------|-------|---------|-------|
| FR-AGENT | 8 | ✅ 8/8 | Epic 3 |
| FR-LLM | 10 | ✅ 10/10 | Epic 2 |
| FR-SCAN | 8 | ✅ 8/8 | Epic 8 |
| FR-DEP | 8 | ✅ 8/8 | Epic 4 |
| FR-QA | 7 | ✅ 7/7 | Epic 6 |
| FR-HEAL | 11 | ✅ 11/11 | Epic 7 |
| FR-GEN | 10 | ✅ 10/10 | Epic 5 |
| FR-OUT | 6 | ✅ 6/6 | Epics 1, 9 |
| FR-CLI | 7 | ✅ 7/7 | Epic 1 |
| FR-UX | 5 | ✅ 5/5 | Epic 9 |
| FR-DEBUG | 4 | ✅ 4/4 | Epic 9 |
| **Total** | **84** | **✅ 84/84** | |

### Dependency Map

```
Epic 1 (Foundation)
    ↓
Epic 2 (Providers) ←──────────────────────┐
    ↓                                     │
Epic 3 (Agents) ──→ Epic 4 (Dependencies) │
    ↓                    ↓                │
Epic 5 (Generation) ←────┘                │
    ↓                                     │
Epic 6 (QA) ──→ Epic 7 (Self-Healing) ────┘
    ↓
Epic 8 (Codebase) ──→ Epic 9 (UX)
```

### Implementation Priority

| Priority | Epics | Rationale |
|----------|-------|-----------|
| P0 - Must | 1, 2, 3, 4, 5 | Core functionality |
| P1 - High | 6, 7, 8 | Key differentiators |
| P2 - Medium | 9 | Polish and extras |

---

**Document Status:** ✅ COMPLETE AND READY FOR IMPLEMENTATION

**Validated:**
- [x] All 84 FRs covered
- [x] All 22 NFRs addressed
- [x] Architecture compliance verified
- [x] No circular dependencies between epics
- [x] Stories properly sized

**Total: 9 Epics, 52 Stories, 84 FRs**
