# Using SAT Locally (Without npm publish)

You have several options to use SAT locally in your projects:

## Option 1: Global Link (Already Set Up) ✅

Since we ran `npm link` in the `sat-cli` directory, SAT is already available globally:

```bash
# Use it anywhere:
cd any-project
sat init
sat gen unit src/file.ts
sat test
```

**To update after making changes:**
```bash
cd sat-cli
npm run build
# Changes are immediately available (no need to re-link)
```

## Option 2: Local Dependency in Each Project

Add SAT as a local dependency in your project's `package.json`:

```json
{
  "devDependencies": {
    "smart-ai-test-suite": "file:../sat-cli"
  }
}
```

Then install:
```bash
npm install
```

Use via npx:
```bash
npx sat init
npx sat gen unit src/file.ts
```

## Option 3: Direct Path Usage

Use the built version directly:

```bash
# From any project:
node /path/to/sat-cli/dist/index.js init
node /path/to/sat-cli/dist/index.js gen unit src/file.ts
```

Or create an alias in your shell:
```bash
# In ~/.bashrc or ~/.zshrc:
alias sat='node /absolute/path/to/sat-cli/dist/index.js'
```

## Option 4: Development Script

Add a script to your project's `package.json`:

```json
{
  "scripts": {
    "sat": "node ../sat-cli/dist/index.js"
  }
}
```

Then use:
```bash
npm run sat init
npm run sat gen unit src/file.ts
```

## Recommended: Keep Using npm link

The `npm link` approach (Option 1) is the simplest:
- ✅ Works globally
- ✅ Easy to update (just rebuild)
- ✅ No need to modify each project
- ✅ Works exactly like a published package

**To verify it's working:**
```bash
which sat  # Should show the linked path
sat --version  # Should show 0.1.0
```

## Updating SAT

When you make changes to SAT:

```bash
cd sat-cli
# Make your changes...
npm run build
# Changes are immediately available everywhere!
```

No need to re-link or reinstall in other projects.

