---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
  - step-13-v2-expansion
status: complete
completedAt: '2026-01-17'
version: '2.0'
inputDocuments:
  - product-brief-Smart-AI-Test-Suit-2026-01-13.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: cli_tool
  domain: developer_tools
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
projectName: 'Smart AI Test Suit'
author: 'Pro'
date: '2026-01-17'
---

# Product Requirements Document - Smart AI Test Suit v2.0

**Author:** Pro
**Date:** 2026-01-17
**Version:** 2.0 (Expanded Scope)

## Executive Summary

**Smart AI Test Suit** is an AI-powered CLI tool that generates high-quality unit tests using multiple LLM providers (Ollama, Groq, OpenAI, Anthropic). It features an **agent-based architecture** for intelligent test generation, **full codebase analysis**, **dependency-aware context building**, and a **self-healing loop** that runs tests and automatically fixes failures.

**Core Value Proposition:** Generate tests that actually work — lint-free, import-correct, properly mocked — and automatically fix any issues until all tests pass.

**Key Differentiators:**
- **Agent Architecture:** Specialized AI agents for analysis, writing, validation, and fixing
- **Multi-Provider LLM:** Ollama (local), Groq, OpenAI, Anthropic — choose your provider
- **Codebase-Aware:** Analyzes entire codebase or single file with full dependency context
- **Self-Healing:** Runs tests, detects failures, auto-fixes, retries until passing
- **Quality-First:** Lint-free, correct imports, proper mocks — tests that actually run

## Success Criteria

### User Success

| Metric | Target | Notes |
|--------|--------|-------|
| Test execution | 100% run without errors | No syntax/import failures after self-healing |
| Self-healing success | 90%+ issues auto-fixed | Max 3 retry attempts |
| Edge case coverage | 3+ per file (floor) | More is better — this is the "magic moment" |
| Mock completeness | 100% external deps mocked | No unmocked dependencies |
| Lint compliance | 0 lint errors | ESLint passes on all generated tests |
| Import accuracy | 100% imports resolve | No broken imports |

**The "Holy Shit" Moment:** User runs `smart-test codebase ./src --run --fix`, walks away, comes back to find all tests passing — every file tested, every mock in place, every edge case covered.

### Business Success

| Metric | Target | Notes |
|--------|--------|-------|
| Product positioning | Best AI testing tool | Not "a" tool — THE tool |
| Provider flexibility | Works with any LLM | Local (Ollama) or cloud (Groq, OpenAI, Anthropic) |
| Enterprise readiness | Self-healing production tests | Tests that actually work in CI/CD |

### Technical Success

| Metric | Target |
|--------|--------|
| Agent orchestration | All 5 agents coordinate seamlessly |
| Provider abstraction | Hot-swap between LLM providers |
| Self-healing loop | Max 3 retries, auto-fix success |
| Codebase scanning | Handle 1000+ file projects |
| Dependency resolution | Full import tree analysis |

## Product Scope

### Core Features (v2.0)

**Test Modes:**
- `smart-test unit <file>` — Single file with dependency analysis
- `smart-test codebase <directory>` — Full codebase testing

**Agent System:**
- Orchestrator Agent — Plans strategy, coordinates agents
- Analyzer Agent — Scans codebase, builds dependency graphs
- Writer Agent — Generates test code with mocks
- Validator Agent — Runs lint, checks imports, verifies mocks
- Fixer Agent — Diagnoses failures, generates corrections

**Multi-Provider LLM:**
- Ollama (local, free, private)
- Groq (cloud, fast, API key)
- OpenAI (cloud, GPT-4, API key)
- Anthropic (cloud, Claude, API key)

**Quality Assurance:**
- ESLint validation before saving
- Import path verification
- Mock completeness checking
- Auto-generated mock stubs

**Self-Healing Loop:**
- Execute generated tests
- Capture and parse failures
- Feed errors back to Fixer Agent
- Regenerate corrected tests
- Retry up to 3 times

### CLI Interface

**Commands:**
```bash
# Single file (with dependency analysis + self-healing)
smart-test unit ./src/utils.ts

# Full codebase
smart-test codebase ./src

# Provider selection
smart-test unit ./src/utils.ts --provider groq
smart-test unit ./src/utils.ts --provider ollama --model codellama

# Self-healing options
smart-test unit ./src/utils.ts --run              # Run tests after generation
smart-test unit ./src/utils.ts --run --fix        # Run + auto-fix failures
smart-test unit ./src/utils.ts --run --fix --max-retries 5

# Quality options
smart-test unit ./src/utils.ts --lint             # Run linter (default: true)
smart-test unit ./src/utils.ts --no-lint          # Skip linting

# Output options
smart-test unit ./src/utils.ts --output ./tests/
smart-test unit ./src/utils.ts --format stdout
smart-test unit ./src/utils.ts --dry-run

# Debug options
smart-test unit ./src/utils.ts --verbose
smart-test unit ./src/utils.ts --prompt-only
```

**Exit Codes:**
| Code | Meaning | User Action |
|------|---------|-------------|
| 0 | Success | All tests generated and passing |
| 1 | General error | Check error message |
| 2 | File not found | Verify file path |
| 3 | LLM connection failed | Check provider config |
| 4 | Timeout | Try smaller scope or faster model |
| 5 | Invalid response | Check `--verbose` output |
| 6 | Tests failed after max retries | Manual intervention needed |
| 7 | Lint errors unfixable | Review generated code |

### Environment Configuration

```bash
# Provider selection
SMART_TEST_PROVIDER=groq        # or ollama, openai, anthropic

# API Keys (only needed for cloud providers)
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Ollama configuration (for local provider)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=codellama

# Default settings
SMART_TEST_MAX_RETRIES=3
SMART_TEST_TIMEOUT=120
```

### Out of Scope (Future Versions)

| Feature | Reason | When |
|---------|--------|------|
| E2E test generation | Different domain, complexity | v3 |
| IDE plugins | CLI-first approach | v3 |
| Watch mode | Nice to have | v2.1 |
| Custom agent definitions | Advanced feature | v3 |

## User Journeys

### Journey 1: Single File with Self-Healing

**Persona:** Alex, solo developer, just finished a complex utility file with multiple async operations and external dependencies.

**Flow:**
```
$ smart-test unit ./src/utils.ts --run --fix

🔍 Analyzer Agent: Scanning utils.ts...
   → Found 3 imports: ./api/client.js, ./services/logger.js, lodash
   → Building dependency context...

✍️  Writer Agent: Generating tests...
   → Creating 12 test cases
   → Generating mocks for api/client, services/logger
   → Identifying 5 edge cases (nulls, boundaries, async errors)

🧪 Validator Agent: Checking quality...
   → ESLint: 0 errors
   → Imports: All resolved
   → Mocks: Complete

▶️  Running tests...
   ✗ 2 tests failed

🔧 Fixer Agent: Analyzing failures...
   → Test 3: TypeError - mock return value incorrect
   → Test 7: Missing async/await
   → Generating fixes...

▶️  Retry 1/3...
   ✓ All 12 tests passing

✅ Generated tests for ./src/utils.ts
   → Output: ./src/utils.test.ts
   → Tests: 12 (5 edge cases)
   → Self-healed: 2 fixes applied
   → Time: 15.3s
```

### Journey 2: Full Codebase Testing

**Persona:** Alex wants to add test coverage to an entire project before a major refactor.

**Flow:**
```
$ smart-test codebase ./src --run --fix

🎯 Orchestrator Agent: Planning test strategy...
   → Scanning ./src directory

🔍 Analyzer Agent: Building codebase map...
   → Found 47 source files
   → Built dependency graph
   → 12 files already have tests
   → 35 files need tests
   → Priority order calculated (leaf nodes first)

📋 Processing files (35 total):

[1/35] src/utils/helpers.ts
   ✍️  Writer: 8 tests generated
   🧪 Validator: Passed
   ▶️  Tests: All passing
   ✓ Complete

[2/35] src/utils/parser.ts
   ✍️  Writer: 15 tests generated
   🧪 Validator: 1 lint warning (auto-fixed)
   ▶️  Tests: 1 failed → Fixed → Passing
   ✓ Complete

... (continuing through all 35 files) ...

[35/35] src/app.ts
   ✍️  Writer: 6 tests generated
   🧪 Validator: Passed
   ▶️  Tests: All passing
   ✓ Complete

═══════════════════════════════════════════════
✅ CODEBASE TEST GENERATION COMPLETE

📊 Summary:
   → Files processed: 35
   → Total tests: 312
   → Edge cases: 89
   → Self-healed: 8 files (23 fixes)
   → Failed (need manual review): 0

⏱️  Total time: 4m 32s
═══════════════════════════════════════════════
```

### Journey 3: Using Different Providers

**Persona:** Alex wants to try different LLM providers for best results.

**Flow:**
```bash
# Use local Ollama (free, private)
$ smart-test unit ./src/api.ts --provider ollama --model deepseek-coder

# Use Groq (fast cloud inference)
$ export GROQ_API_KEY=gsk_xxx
$ smart-test unit ./src/api.ts --provider groq

# Use OpenAI (GPT-4 quality)
$ export OPENAI_API_KEY=sk_xxx
$ smart-test unit ./src/api.ts --provider openai --model gpt-4

# Use Anthropic (Claude quality)
$ export ANTHROPIC_API_KEY=sk-ant-xxx
$ smart-test unit ./src/api.ts --provider anthropic --model claude-3-opus
```

## Functional Requirements

### Agent System (FR-AGENT)

| ID | Requirement |
|----|-------------|
| FR-AGENT-01 | System provides an Orchestrator Agent that plans testing strategy |
| FR-AGENT-02 | System provides an Analyzer Agent that scans codebase and builds dependency graphs |
| FR-AGENT-03 | System provides a Writer Agent that generates test code |
| FR-AGENT-04 | System provides a Validator Agent that checks lint, imports, and mocks |
| FR-AGENT-05 | System provides a Fixer Agent that diagnoses and fixes test failures |
| FR-AGENT-06 | Agents communicate through a defined protocol |
| FR-AGENT-07 | Orchestrator coordinates agent execution sequence |
| FR-AGENT-08 | Agents can be run in parallel where independent |

### Multi-Provider LLM (FR-LLM)

| ID | Requirement |
|----|-------------|
| FR-LLM-01 | User can use Ollama as a local LLM provider |
| FR-LLM-02 | User can use Groq as a cloud LLM provider |
| FR-LLM-03 | User can use OpenAI as a cloud LLM provider |
| FR-LLM-04 | User can use Anthropic as a cloud LLM provider |
| FR-LLM-05 | User can select provider via `--provider` flag |
| FR-LLM-06 | User can select model via `--model` flag |
| FR-LLM-07 | System auto-detects available providers |
| FR-LLM-08 | System provides fallback chain if provider fails |
| FR-LLM-09 | API keys are read from environment variables |
| FR-LLM-10 | System validates API key before making requests |

### Codebase Analysis (FR-SCAN)

| ID | Requirement |
|----|-------------|
| FR-SCAN-01 | User can invoke `smart-test codebase <directory>` to test entire codebase |
| FR-SCAN-02 | System discovers all source files (TS/JS) in directory recursively |
| FR-SCAN-03 | System excludes common directories (node_modules, dist, .git) |
| FR-SCAN-04 | System identifies files without existing tests |
| FR-SCAN-05 | System builds full dependency graph for codebase |
| FR-SCAN-06 | System calculates optimal test generation order (leaf nodes first) |
| FR-SCAN-07 | System tracks progress across multiple files |
| FR-SCAN-08 | System generates aggregate report at completion |

### Dependency Resolution (FR-DEP)

| ID | Requirement |
|----|-------------|
| FR-DEP-01 | System parses imports from target file |
| FR-DEP-02 | System resolves relative import paths |
| FR-DEP-03 | System identifies external package imports |
| FR-DEP-04 | System recursively analyzes imported files |
| FR-DEP-05 | System extracts types, interfaces from dependencies |
| FR-DEP-06 | System extracts function signatures from dependencies |
| FR-DEP-07 | System builds context package for LLM with all dependency info |
| FR-DEP-08 | System handles circular dependencies gracefully |

### Quality Assurance (FR-QA)

| ID | Requirement |
|----|-------------|
| FR-QA-01 | System runs ESLint on generated tests before saving |
| FR-QA-02 | System validates all import paths resolve correctly |
| FR-QA-03 | System verifies all external dependencies have mocks |
| FR-QA-04 | System auto-generates mock stubs for missing mocks |
| FR-QA-05 | System validates TypeScript types if tsconfig exists |
| FR-QA-06 | User can skip lint check with `--no-lint` flag |
| FR-QA-07 | System reports quality issues with suggested fixes |

### Self-Healing (FR-HEAL)

| ID | Requirement |
|----|-------------|
| FR-HEAL-01 | User can run generated tests with `--run` flag |
| FR-HEAL-02 | User can enable auto-fix with `--fix` flag |
| FR-HEAL-03 | System executes tests using detected test runner (vitest, jest) |
| FR-HEAL-04 | System captures test failure output |
| FR-HEAL-05 | System parses failure messages to identify root cause |
| FR-HEAL-06 | Fixer Agent receives failure context and original test |
| FR-HEAL-07 | Fixer Agent generates corrected test code |
| FR-HEAL-08 | System retries up to configurable max (default: 3) |
| FR-HEAL-09 | User can configure max retries with `--max-retries` flag |
| FR-HEAL-10 | System reports final status (all passing / failures remaining) |
| FR-HEAL-11 | System exits with code 6 if tests fail after max retries |

### Test Generation Core (FR-GEN)

| ID | Requirement |
|----|-------------|
| FR-GEN-01 | User can generate unit tests for a single TypeScript file |
| FR-GEN-02 | User can generate unit tests for a single JavaScript file |
| FR-GEN-03 | System reads source file content |
| FR-GEN-04 | System identifies edge cases (nulls, boundaries, empty states) |
| FR-GEN-05 | System generates 3+ edge case tests per file |
| FR-GEN-06 | System produces syntactically valid test code |
| FR-GEN-07 | System extracts test code from LLM response (last code block) |
| FR-GEN-08 | System auto-detects test framework from package.json |
| FR-GEN-09 | User can override framework via `--framework` flag |
| FR-GEN-10 | System generates framework-appropriate test syntax |

### Output Handling (FR-OUT)

| ID | Requirement |
|----|-------------|
| FR-OUT-01 | System writes tests to `.test.ts` file by default |
| FR-OUT-02 | User can output to stdout via `--format stdout` |
| FR-OUT-03 | User can specify custom output path via `--output` flag |
| FR-OUT-04 | System writes valid tests even with warnings |
| FR-OUT-05 | System reports tests needing manual review |
| FR-OUT-06 | User can preview without writing via `--dry-run` |

### CLI Interface (FR-CLI)

| ID | Requirement |
|----|-------------|
| FR-CLI-01 | User can invoke `smart-test unit <file>` command |
| FR-CLI-02 | User can invoke `smart-test codebase <directory>` command |
| FR-CLI-03 | User can view help via `--help` flag |
| FR-CLI-04 | System provides semantic exit codes (0-7) |
| FR-CLI-05 | System displays actionable error messages |
| FR-CLI-06 | System gracefully handles invalid input |
| FR-CLI-07 | System determines sensible defaults |

### User Experience (FR-UX)

| ID | Requirement |
|----|-------------|
| FR-UX-01 | User sees progress spinner during generation |
| FR-UX-02 | User sees which agent is currently active |
| FR-UX-03 | User sees summary after completion |
| FR-UX-04 | User sees warnings for tests needing review |
| FR-UX-05 | User sees self-healing progress (retry count, fixes applied) |

### Debugging & Contribution (FR-DEBUG)

| ID | Requirement |
|----|-------------|
| FR-DEBUG-01 | User can view prompt via `--verbose` flag |
| FR-DEBUG-02 | User can output only prompt via `--prompt-only` flag |
| FR-DEBUG-03 | Contributor can read prompts as markdown files |
| FR-DEBUG-04 | Contributor can run tool locally |

## Non-Functional Requirements

### Performance

| NFR | Requirement | Rationale |
|-----|-------------|-----------|
| NFR-PERF-01 | CLI startup time < 1 second | Fast tool adoption |
| NFR-PERF-02 | File reading < 100ms per file | Minimize I/O wait |
| NFR-PERF-03 | Dependency resolution < 2s for 100-file project | Don't block on analysis |
| NFR-PERF-04 | Codebase scanning < 5s for 1000-file project | Handle large projects |
| NFR-PERF-05 | Provider timeout configurable (default: 120s) | Balance patience and feedback |

### Reliability

| NFR | Requirement | Rationale |
|-----|-------------|-----------|
| NFR-REL-01 | Zero crashes during normal operation | Trust is everything |
| NFR-REL-02 | All errors result in graceful exit | Never leave user confused |
| NFR-REL-03 | Partial failures don't crash the tool | Continue with what works |
| NFR-REL-04 | Invalid input produces helpful error | Developer UX |
| NFR-REL-05 | Self-healing loop has bounded retries | Prevent infinite loops |
| NFR-REL-06 | Provider failover works seamlessly | Continuous operation |

### Security

| NFR | Requirement | Rationale |
|-----|-------------|-----------|
| NFR-SEC-01 | API keys read from environment only | No hardcoding |
| NFR-SEC-02 | API keys never logged or displayed | Prevent leaks |
| NFR-SEC-03 | Local provider (Ollama) sends no data externally | Privacy option |
| NFR-SEC-04 | No telemetry or analytics | User trust |

### Usability

| NFR | Requirement | Rationale |
|-----|-------------|-----------|
| NFR-USE-01 | Help output fits 80-char terminal | Readable without scrolling |
| NFR-USE-02 | Error messages include suggested fix | Reduce frustration |
| NFR-USE-03 | Progress shows within 500ms | User knows it's working |
| NFR-USE-04 | Agent status visible during execution | Transparency |

### Scalability

| NFR | Requirement | Rationale |
|-----|-------------|-----------|
| NFR-SCALE-01 | Handle 1000+ file codebases | Enterprise projects |
| NFR-SCALE-02 | Memory usage < 500MB for large projects | Resource efficiency |
| NFR-SCALE-03 | Concurrent file processing where possible | Speed for large codebases |

## Technical Constraints

| Constraint | Impact |
|------------|--------|
| TypeScript + Ink | Runtime: Node.js, TUI framework |
| Multiple LLM APIs | Provider abstraction required |
| Test runner integration | Spawn vitest/jest process |
| ESLint integration | Programmatic API usage |
| File system operations | Async, cross-platform |

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM response quality varies by provider | High | Medium | Provider-specific prompt tuning |
| Self-healing loop doesn't converge | Medium | High | Max retry limit, clear failure reporting |
| Large codebase overwhelms memory | Low | High | Streaming file processing, chunking |
| API rate limits | Medium | Medium | Rate limiting, backoff, local fallback |
| Circular dependencies in analysis | Medium | Medium | Cycle detection, graceful handling |

## Appendix: FR Summary

| Category | Count |
|----------|-------|
| FR-AGENT | 8 |
| FR-LLM | 10 |
| FR-SCAN | 8 |
| FR-DEP | 8 |
| FR-QA | 7 |
| FR-HEAL | 11 |
| FR-GEN | 10 |
| FR-OUT | 6 |
| FR-CLI | 7 |
| FR-UX | 5 |
| FR-DEBUG | 4 |
| **Total** | **84** |

## Appendix: NFR Summary

| Category | Count |
|----------|-------|
| NFR-PERF | 5 |
| NFR-REL | 6 |
| NFR-SEC | 4 |
| NFR-USE | 4 |
| NFR-SCALE | 3 |
| **Total** | **22** |
