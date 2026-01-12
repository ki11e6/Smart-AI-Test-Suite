# SAT Demo Example Project

This project demonstrates how to use Smart AI Test Suite (SAT) to generate tests.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize SAT:
   ```bash
   sat init
   ```

3. Generate tests:
   ```bash
   sat gen unit src/utils.ts
   ```

4. Run tests:
   ```bash
   sat test
   ```

5. Check coverage:
   ```bash
   sat coverage
   ```

## What's in this project?

- `src/utils.ts` - Contains utility functions and a Calculator class
- Generated test files will appear in `__tests__/`

## Manual Testing

You can also run Jest directly:
```bash
npm test
```

