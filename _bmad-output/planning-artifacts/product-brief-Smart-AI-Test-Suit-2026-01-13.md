---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
date: 2026-01-13
author: Pro
projectName: Smart AI Test Suit
conversationContext: |
  - CLI tool similar to Claude Code, specialized in testing domain
  - LLM-agnostic (supports open source LLMs: Ollama, Llama, Mistral, DeepSeek, etc.)
  - Language-agnostic (AI determines appropriate test framework)
  - MVP Focus: Brilliant unit test generation for a single file
  - 10-hour development window
techStack: |
  - Language: TypeScript
  - TUI: Ink
  - LLM Backend: Ollama
---

# Product Brief: Smart AI Test Suit

## Executive Summary

**Smart AI Test Suit** is a CLI-first testing tool that leverages open source LLMs to eliminate the tedium of writing tests. Built in TypeScript for rapid development, it generates high-quality unit tests by analyzing code context, pattern-matching, and identifying edge cases — all without IDE lock-in.

---

## Core Vision

### Problem Statement

Developers universally hate writing tests. It's tedious, repetitive, and pulls focus from building features. Existing AI solutions like Copilot produce tests that *pass* but don't *catch bugs*.

### Problem Impact

- Tests get skipped or written poorly due to time pressure
- Low-quality AI-generated tests create false confidence
- Technical debt accumulates; bugs ship to production

### Why Existing Solutions Fall Short

- **GitHub Copilot**: "Meh" quality — tests pass but catch nothing, IDE-locked
- **ChatGPT workflows**: Copy-paste friction, no workflow integration
- **Other AI tools**: Proprietary LLM lock-in, cost, privacy concerns

### Proposed Solution

A **CLI-first AI testing tool** that:
- Analyzes code context (file + imports + dependencies)
- Pattern-matches existing code for test structure
- Identifies edge cases (nulls, boundaries, empty states)
- Lets the LLM do the heavy lifting — no custom parsers
- Outputs framework-appropriate tests automatically

**Architecture:** `CLI → Context Builder → LLM API → Test File Writer`

### Key Differentiators

1. **CLI-First**: Works anywhere — terminal, CI/CD, scripts
2. **Free. Private. Local.**: Open source LLMs via Ollama — zero cost, data stays local
3. **Quality-Focused**: Tests that catch bugs, not just tests that pass
4. **TypeScript Core**: Fast development, extensible, hackathon-ready

### Tech Stack (MVP)

- **Language**: TypeScript
- **TUI**: Ink
- **LLM Backend**: Ollama (Llama, Mistral, DeepSeek)
- **Build Target**: 10 hours

---

## Target Users

### Primary Users

**Persona: Alex — "The Shipping Solo Dev"**

| Attribute | Profile |
|-----------|---------|
| **Role** | Solo developer / Indie hacker / Freelancer |
| **Context** | Building side projects, SaaS MVPs, client work — alone |
| **Technical Level** | Intermediate to senior — knows tests matter, still skips them |
| **Motivation** | Ship fast, validate ideas, stay lean |
| **Testing Reality** | "I'll add tests later" → never happens |
| **Current Pain** | Bugs in production, fear of refactoring, growing technical debt guilt |
| **Workarounds** | Manual testing, console.log debugging, crossing fingers |

**Alex's Goals:**
- Ship features without the guilt of skipping tests
- Catch bugs before users do
- Refactor with confidence

**What Makes Alex Choose Smart AI Test Suit:**
- Zero friction: one command, tests appear
- No cost: runs locally on open source LLMs
- No context switching: stays in terminal

### Secondary Users

N/A for MVP — laser focus on solo devs.

### User Journey

| Stage | Alex's Experience |
|-------|-------------------|
| **Discovery** | Sees it on Hacker News, Reddit, or Twitter — "AI test generator that actually works?" |
| **Install** | `npm install -g smart-test` → done in seconds |
| **First Use** | `smart-test unit ./src/utils.ts` → tests generated |
| **Aha Moment** | "Wait... 12 tests covering edge cases I didn't think of? In 10 seconds?" |
| **Habit** | Runs it on every new file before committing — testing guilt: gone |

---

## Success Metrics

### MVP Success Criteria (Hackathon)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Demo stability** | 100% | Tool completes without crash during live demo |
| **Tests execute** | 100% | Generated test files run with `npm test` / `pytest` / etc. |
| **Tests pass syntax** | 100% | No syntax errors in generated code |

### User Success Metrics (Alex)

| Metric | Target | Indicator |
|--------|--------|-----------|
| **Generation success** | Works on any file | Tool produces output for valid source files |
| **Test validity** | Tests run | Generated tests execute without import/syntax errors |
| **Edge case coverage** | 3+ edge cases per file | Tests include null checks, boundaries, empty states |
| **Time saved** | < 30 seconds | Faster than Alex would write tests manually |

### Business Objectives

**Hackathon Goals:**
- Functional demo that impresses judges
- Proof of concept that validates the idea
- Foundation for post-hackathon development

### Key Performance Indicators

| KPI | MVP Target |
|-----|------------|
| **Files supported** | Any TypeScript/JavaScript file |
| **Generation time** | < 30 seconds per file |
| **Test pass rate** | 100% of generated tests execute |
| **Demo success** | Zero crashes during presentation |

---

## MVP Scope

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **CLI Entry Point** | `smart-test unit <file>` command parses args and orchestrates flow | MUST HAVE |
| **File Reader** | Reads target source file, detects language (TS/JS initially) | MUST HAVE |
| **Context Builder** | Gathers file content, extracts imports, identifies dependencies | MUST HAVE |
| **Ollama Integration** | Connects to local Ollama, sends prompt with context, receives generated tests | MUST HAVE |
| **Test File Writer** | Saves generated tests to appropriate location (`.test.ts`, `.spec.ts`) | MUST HAVE |
| **Basic TUI** | Spinner/progress indicator while LLM generates | NICE TO HAVE |

**Architecture Flow:**
```
smart-test unit ./src/utils.ts
       ↓
  [File Reader] → Read file, detect language
       ↓
  [Context Builder] → Extract code, imports, types
       ↓
  [Ollama Client] → Send prompt, await response
       ↓
  [Test Writer] → Save to ./src/utils.test.ts
       ↓
  ✓ Done!
```

### Out of Scope for MVP

| Feature | Reason | When |
|---------|--------|------|
| Batch processing (multiple files) | Complexity, time | v2 |
| E2E test generation | Different prompt strategy | v2 |
| Multiple LLM providers | Ollama is enough for demo | v2 |
| Config files (`.smarttestrc`) | Not needed for demo | v2 |
| Test runner integration | User can run tests manually | v2 |
| Watch mode | Nice to have, not critical | v2 |
| IDE plugins | CLI-first, no IDE dependency | v3+ |

### MVP Success Criteria

- [ ] `smart-test unit <file>` runs without crashing
- [ ] Generated test file has valid syntax
- [ ] Generated tests execute with `npm test` or equivalent
- [ ] Demo completes successfully on stage
- [ ] At least 3 edge cases covered per file

### Future Vision

**v2 (Post-Hackathon):**
- Multi-file batch processing
- E2E test generation with Playwright/Cypress
- Multiple LLM backends (OpenAI, Anthropic, local)
- Config file support
- CI/CD integration

**v3 (Growth):**
- IDE extensions (VS Code, JetBrains)
- Team collaboration features
- Test coverage analysis
- Custom prompt templates

