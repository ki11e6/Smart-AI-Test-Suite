# Smart AI Test Suite

AI-powered test generation CLI that writes high-quality unit tests for your code using LLMs.

```bash
smart-test unit src/utils.ts
```

**Generate comprehensive tests in seconds, not hours.**

---

## Features

- **Multi-Provider Support** - Works with Groq, OpenAI, Anthropic, or local Ollama
- **Self-Healing Tests** - Automatically fixes failing tests with retry loops
- **Edge Case Detection** - AI identifies null checks, boundaries, and error states
- **Framework Agnostic** - Generates tests for Vitest, Jest, or Mocha
- **CLI-First** - Works in any terminal, CI/CD pipeline, or script
- **Privacy Option** - Use Ollama to keep your code 100% local

---

## Quick Start

### 1. Install

```bash
# Clone and build
git clone https://github.com/yourusername/smart-ai-test-suite.git
cd smart-ai-test-suite
npm install
npm run build

# Install globally
npm link
```

### 2. Configure Provider

Set up at least one LLM provider:

```bash
# Option A: Groq (recommended - fast and free tier available)
export GROQ_API_KEY=gsk_your_api_key_here

# Option B: OpenAI
export OPENAI_API_KEY=sk-your_api_key_here

# Option C: Anthropic
export ANTHROPIC_API_KEY=sk-ant-your_api_key_here

# Option D: Ollama (local, no API key needed)
ollama serve
ollama pull codellama
```

### 3. Generate Tests

```bash
smart-test unit src/utils.ts
```

That's it! Your tests are generated at `src/utils.test.ts`.

---

## Installation Options

### Global Install (Recommended)

```bash
cd smart-ai-test-suite
npm run build
npm link

# Now available everywhere
smart-test unit /path/to/any/file.ts
```

### As Project Dependency

```bash
# In your project
npm install --save-dev /path/to/smart-ai-test-suite

# Use via npx
npx smart-test unit src/utils.ts
```

### Direct Execution

```bash
node /path/to/smart-ai-test-suite/dist/cli.js unit src/utils.ts
```

---

## Usage

### Generate Tests for a Single File

```bash
smart-test unit src/utils.ts
```

### Specify Provider and Model

```bash
# Use Groq with specific model
smart-test unit src/api.ts -p groq -m llama-3.3-70b-versatile

# Use OpenAI
smart-test unit src/api.ts -p openai -m gpt-4

# Use local Ollama
smart-test unit src/api.ts -p ollama -m codellama
```

### Run and Auto-Fix Tests

```bash
# Generate tests, run them, and auto-fix any failures
smart-test unit src/api.ts --run --fix

# With custom retry limit
smart-test unit src/api.ts --run --fix --max-retries 5
```

### Output Formats

```bash
# Write to file (default)
smart-test unit src/utils.ts

# Output to stdout (for piping)
smart-test unit src/utils.ts --format stdout > custom-path/utils.test.ts

# JSON output (for CI/CD integration)
smart-test unit src/utils.ts --format json
```

### Scan Entire Codebase

```bash
# Generate tests for all untested files
smart-test codebase src/

# With exclusions
smart-test codebase src/ --exclude "**/*.config.ts,**/*.d.ts"

# Parallel processing
smart-test codebase src/ --parallel 4
```

### Check Available Providers

```bash
smart-test providers
```

Output:
```
[Smart Test] Checking available providers...

  ✓ groq: available (model: llama-3.3-70b-versatile)
  ✗ openai: not available
  ✗ anthropic: not available
  ✓ ollama: available (model: codellama)

Default provider (auto-detect): groq
```

---

## CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `smart-test unit <file>` | Generate tests for a single source file |
| `smart-test codebase <dir>` | Generate tests for entire codebase |
| `smart-test providers` | List available LLM providers |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --provider <name>` | LLM provider (`ollama`, `groq`, `openai`, `anthropic`) | Auto-detect |
| `-m, --model <name>` | Model name | Provider default |
| `-f, --framework <name>` | Test framework (`vitest`, `jest`, `mocha`) | `vitest` |
| `-o, --output <dir>` | Output directory for test files | Same as source |
| `-r, --run` | Run tests after generation | `false` |
| `--fix` | Auto-fix failing tests (requires `--run`) | `false` |
| `--max-retries <n>` | Maximum fix attempts | `3` |
| `--timeout <seconds>` | Operation timeout | `120` |
| `--format <type>` | Output format (`file`, `stdout`, `json`) | `file` |
| `--verbose` | Enable detailed output | `false` |
| `--prompt-only` | Output prompt without calling LLM | `false` |

### Codebase-Specific Options

| Option | Description |
|--------|-------------|
| `-i, --include <patterns>` | Include file patterns (comma-separated) |
| `-e, --exclude <patterns>` | Exclude file patterns (comma-separated) |
| `--parallel <n>` | Number of parallel workers |

---

## Environment Variables

```bash
# Provider Selection
SMART_TEST_PROVIDER=groq          # Default provider

# API Keys
GROQ_API_KEY=gsk_xxx              # Groq API key
OPENAI_API_KEY=sk-xxx             # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-xxx      # Anthropic API key

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434  # Ollama server URL
OLLAMA_MODEL=codellama              # Default Ollama model

# Defaults
SMART_TEST_MAX_RETRIES=3          # Default max retries
SMART_TEST_TIMEOUT=120            # Default timeout (seconds)
```

Add these to your `~/.bashrc` or `~/.zshrc` for persistence:

```bash
export GROQ_API_KEY=gsk_your_key_here
export SMART_TEST_PROVIDER=groq
```

---

## Supported Providers

| Provider | Models | Notes |
|----------|--------|-------|
| **Groq** | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` | Fast, free tier available |
| **OpenAI** | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` | High quality |
| **Anthropic** | `claude-3-opus`, `claude-3-sonnet` | Excellent reasoning |
| **Ollama** | `codellama`, `llama3.2`, `mistral` | Local, private |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        smart-test unit src/utils.ts             │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. ANALYZER AGENT                                              │
│     - Reads source file                                         │
│     - Extracts imports, exports, dependencies                   │
│     - Detects language (TypeScript/JavaScript)                  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. WRITER AGENT                                                │
│     - Builds context-aware prompt                               │
│     - Calls LLM to generate tests                               │
│     - Identifies edge cases                                     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. VALIDATOR AGENT                                             │
│     - Checks syntax validity                                    │
│     - Validates imports                                         │
│     - Runs ESLint checks                                        │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. SELF-HEALING LOOP (if --run --fix)                          │
│     - Runs tests                                                │
│     - If failures: FIXER AGENT analyzes and fixes               │
│     - Retries until pass or max attempts                        │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. OUTPUT                                                      │
│     - Writes test file (src/utils.test.ts)                      │
│     - Reports metrics and edge cases                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Examples

### Basic Test Generation

```bash
$ smart-test unit src/utils.ts -p groq -m llama-3.3-70b-versatile

[Smart Test] Using provider: Groq
[Smart Test] Generating tests for: src/utils.ts
🔍 Analyzer: Analyzing source file...
✍️ Writer: Generating tests...
🧪 Validator: Validating generated tests...
✅ Complete: Test generation complete

[Smart Test] Tests written to: src/utils.test.ts
[Smart Test] Generated 19 test(s)
[Smart Test] Edge cases covered: null input, empty string, invalid format...
[Smart Test] Duration: 2699ms
```

### With Self-Healing

```bash
$ smart-test unit src/api.ts --run --fix --verbose

[Smart Test] Using provider: Groq
[Smart Test] Generating tests for: src/api.ts
🔍 Analyzer: Analyzing source file...
✍️ Writer: Generating tests...
🧪 Validator: Validating generated tests...
▶️ Runner: Running tests (attempt 1/3)...
🔧 Fixer: 2 test(s) failed, attempting fix (1/3)...
▶️ Runner: Running tests (attempt 2/3)...
✅ Complete: All tests passing

[Smart Test] Tests written to: src/api.test.ts
[Smart Test] Generated 15 test(s)
[Smart Test] Self-healing attempts: 1
```

### JSON Output for CI/CD

```bash
$ smart-test unit src/utils.ts --format json

{
  "sourceFile": "src/utils.ts",
  "testFile": "src/utils.test.ts",
  "testCount": 19,
  "edgeCases": ["null input", "empty string", "boundary values"],
  "validationPassed": true,
  "metrics": {
    "totalDuration": 2699,
    "analyzerDuration": 45,
    "writerDuration": 2500,
    "validatorDuration": 154,
    "llmCalls": 1
  }
}
```

---

## Project Structure

```
smart-ai-test-suite/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── types.ts            # Shared type definitions
│   │
│   ├── agents/             # AI agent system
│   │   ├── orchestrator.ts # Pipeline coordinator
│   │   ├── analyzer.ts     # Source code analyzer
│   │   ├── writer.ts       # Test generator
│   │   ├── validator.ts    # Test validator
│   │   └── fixer.ts        # Self-healing fixer
│   │
│   ├── providers/          # LLM providers
│   │   ├── factory.ts      # Provider factory
│   │   ├── groq.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── ollama.ts
│   │
│   ├── services/           # Business logic
│   │   ├── test-runner.ts
│   │   ├── prompt-builder.ts
│   │   └── codebase-scanner.ts
│   │
│   └── ui/                 # Terminal UI
│       └── progress-reporter.ts
│
├── prompts/                # LLM prompt templates
│   ├── unit-test.md
│   ├── fix-test.md
│   └── analyze-failure.md
│
└── example-project/        # Demo project
```

---

## Requirements

- **Node.js** 20.0.0 or higher
- **npm** 8.0.0 or higher
- One of the following:
  - Groq API key
  - OpenAI API key
  - Anthropic API key
  - Ollama running locally

---

## Troubleshooting

### "No providers available"

Ensure you have at least one provider configured:

```bash
# Check your API key is set
echo $GROQ_API_KEY

# Or start Ollama
ollama serve
```

### "Model not found" (Ollama)

Pull the model first:

```bash
ollama pull codellama
```

### Tests have wrong import paths

This can happen occasionally. The self-healing loop (`--run --fix`) usually corrects this, or you can manually fix the import path in the generated test file.

### Timeout errors

Increase the timeout for slower models:

```bash
smart-test unit src/large-file.ts --timeout 300
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js) for CLI
- [Ink](https://github.com/vadimdemedes/ink) for terminal UI
- [Vitest](https://vitest.dev/) as the default test framework
- LLM providers: Groq, OpenAI, Anthropic, Ollama

---

**Made with AI, for developers who'd rather ship features than write tests.**
