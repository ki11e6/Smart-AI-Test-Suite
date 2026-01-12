# Quick Start - Using SAT Locally

## Problem: `sat: command not found`

If `npm link` didn't work (common on Windows/Git Bash), here are quick solutions:

## Solution 1: Use Direct Path (Easiest)

Create an alias or use the full path:

**Git Bash / Linux / Mac:**
```bash
# Add to ~/.bashrc or ~/.zshrc:
alias sat='node /e/ashik/Ashik/Projects/Smart-AI-Test-Suite/sat-cli/dist/index.js'

# Then reload:
source ~/.bashrc
```

**Windows CMD:**
```cmd
# Add to your PATH or create a batch file
set PATH=E:\ashik\Ashik\Projects\Smart-AI-Test-Suite\sat-cli\bin;%PATH%
```

## Solution 2: Use npx with Path

In any project, use:
```bash
npx ../sat-cli/dist/index.js init
npx ../sat-cli/dist/index.js gen unit src/file.ts
```

Or create a script in your project's `package.json`:
```json
{
  "scripts": {
    "sat": "node ../sat-cli/dist/index.js",
    "sat:init": "node ../sat-cli/dist/index.js init",
    "sat:gen": "node ../sat-cli/dist/index.js gen unit",
    "sat:test": "node ../sat-cli/dist/index.js test"
  }
}
```

Then use:
```bash
npm run sat:init
npm run sat:gen src/utils.ts
npm run sat:test
```

## Solution 3: Add to PATH Manually

**Windows:**
1. Add `E:\ashik\Ashik\Projects\Smart-AI-Test-Suite\sat-cli\bin` to your system PATH
2. Restart terminal

**Git Bash:**
```bash
# Add to ~/.bashrc:
export PATH="/e/ashik/Ashik/Projects/Smart-AI-Test-Suite/sat-cli/bin:$PATH"
source ~/.bashrc
```

## Solution 4: Use from Project Scripts (Recommended)

In each project where you want to use SAT, add to `package.json`:

```json
{
  "scripts": {
    "sat": "node ../sat-cli/dist/index.js"
  }
}
```

Then:
```bash
npm run sat init
npm run sat gen unit src/file.ts
npm run sat test
```

## Verify It Works

```bash
# Test the direct path:
node sat-cli/dist/index.js --version

# Should output: 0.1.0
```

## Recommended Approach

For local development, **Solution 4** (project scripts) is cleanest:
- No global PATH changes needed
- Works the same way in all projects
- Easy to update (just rebuild sat-cli)
- No npm link issues

