# Fixing PowerShell Execution Policy Issue

## The Problem

PowerShell is blocking npm scripts due to execution policy restrictions.

## Solution 1: Fix PowerShell Execution Policy (Recommended)

Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows local scripts to run while still requiring signed scripts from the internet.

**Then verify:**
```powershell
Get-ExecutionPolicy
# Should show: RemoteSigned
```

## Solution 2: Use Git Bash Instead

Switch to Git Bash (which you were using before):
```bash
# In Git Bash:
npm run sat:init
npm run sat:gen src/utils.ts
npm run sat:test
```

## Solution 3: Use Direct Node Commands (No npm scripts)

Instead of `npm run sat:init`, use:

```powershell
# PowerShell:
node ..\sat-cli\dist\index.js init
node ..\sat-cli\dist\index.js gen unit src\utils.ts
node ..\sat-cli\dist\index.js test
```

Or create batch files in your project:

**sat-init.bat:**
```batch
@echo off
node ..\sat-cli\dist\index.js init
```

**sat-gen.bat:**
```batch
@echo off
node ..\sat-cli\dist\index.js gen unit %1
```

Then use:
```powershell
.\sat-init.bat
.\sat-gen.bat src\utils.ts
```

## Solution 4: Use CMD Instead of PowerShell

Open Command Prompt (cmd.exe) instead of PowerShell:
```cmd
npm run sat:init
npm run sat:gen src/utils.ts
npm run sat:test
```

CMD doesn't have the same execution policy restrictions.

## Recommended: Use Git Bash

Since you're already using Git Bash, just stick with it:
- No execution policy issues
- Works with npm scripts
- Better for development

```bash
# In Git Bash:
cd example-project
npm run sat:init
npm run sat:gen src/utils.ts
npm run sat:test
```

