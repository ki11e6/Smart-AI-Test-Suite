# Setting Up SAT for Local Use

## The Issue

`npm link` created the symlink, but Git Bash might not have npm's global bin in PATH.

## Quick Fix: Add npm bin to PATH

**For Git Bash, add this to `~/.bashrc`:**

```bash
# Add npm global bin to PATH
export PATH="$PATH:/c/Users/Planet/AppData/Roaming/npm"
```

Then reload:
```bash
source ~/.bashrc
```

Now `sat` should work!

## Alternative: Use Direct Path

If you don't want to modify PATH, use the full path:

```bash
# From any project:
/c/Users/Planet/AppData/Roaming/npm/sat init
/c/Users/Planet/AppData/Roaming/npm/sat gen unit src/file.ts
```

## Best Solution: Project Scripts (No PATH needed)

In each project's `package.json`, add:

```json
{
  "scripts": {
    "sat": "node ../sat-cli/dist/index.js",
    "sat:init": "node ../sat-cli/dist/index.js init",
    "sat:gen": "node ../sat-cli/dist/index.js gen unit",
    "sat:test": "node ../sat-cli/dist/index.js test",
    "sat:coverage": "node ../sat-cli/dist/index.js coverage"
  }
}
```

Then use:
```bash
npm run sat:init
npm run sat:gen src/utils.ts
npm run sat:test
```

This works without any PATH modifications!

## Verify Setup

After adding to PATH or using scripts:
```bash
sat --version  # Should show: 0.1.0
```

