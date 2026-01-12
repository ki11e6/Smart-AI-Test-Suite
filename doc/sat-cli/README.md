# Smart AI Test Suite (SAT)

Unified CLI tool for automated test generation and execution. Generate tests in minutes, not hours.

## Installation

```bash
npm install -g smart-ai-test-suite
```

## Quick Start

1. **Initialize SAT in your project:**
   ```bash
   sat init
   ```

2. **Generate tests for a file:**
   ```bash
   sat gen unit src/utils/validator.ts
   ```

3. **Run tests:**
   ```bash
   sat test
   ```

4. **Check coverage:**
   ```bash
   sat coverage
   ```

## Commands

### `sat init`
Initialize SAT in your project. Detects your test framework (Jest, Vitest, Mocha) and creates configuration.

### `sat gen unit <file>`
Generate unit tests for a TypeScript/JavaScript file.

### `sat test`
Run tests using your configured test framework.

### `sat coverage`
Generate and display test coverage report.

## Requirements

- Node.js 18+
- TypeScript/JavaScript project
- Jest, Vitest, or Mocha installed

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev
```

## License

MIT

