import * as fs from 'fs-extra';
import * as path from 'path';
import dotenv from 'dotenv';

// Load .env from CLI tool directory (for development)
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface SATConfig {
  groqApiKey?: string;
  model: string;
  framework: string;
  testDir: string;
  projectName?: string;
}

export interface ProjectConfig {
  framework: string;
  testDir: string;
  testFilePattern: string;
  // Note: API keys should NOT be stored in .satrc (use .env instead)
}

/**
 * Load configuration from multiple sources:
 * 1. Environment variables (highest priority) - includes .env file via dotenv
 * 2. .satrc in current project directory (for non-sensitive config)
 * 3. Default values
 *
 * SECURITY: API keys are ONLY loaded from environment variables (.env file),
 * never from .satrc which may be committed to version control.
 */
export async function loadConfig(): Promise<SATConfig> {
  // Load .env from current working directory (project-level)
  const envPath = path.join(process.cwd(), '.env');
  if (await fs.pathExists(envPath)) {
    dotenv.config({ path: envPath });
  }

  // Environment variables (API key ONLY from env, never from .satrc)
  const envKey = process.env.GROQ_API_KEY;
  const envModel = process.env.SAT_MODEL;

  // Project .satrc file (non-sensitive config only)
  const satrcPath = path.join(process.cwd(), '.satrc');
  let fileConfig: Partial<ProjectConfig> = {};

  if (await fs.pathExists(satrcPath)) {
    try {
      fileConfig = await fs.readJson(satrcPath);
    } catch (error) {
      console.warn('Warning: Could not parse .satrc file');
    }
  }

  // Get project name from package.json
  let projectName: string | undefined;
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const pkg = await fs.readJson(packageJsonPath);
      projectName = pkg.name;
    } catch {
      // Ignore
    }
  }

  return {
    groqApiKey: envKey,  // Only from environment, not from .satrc
    model: envModel || 'llama-3.3-70b-versatile',
    framework: fileConfig.framework || 'jest',
    testDir: fileConfig.testDir || '__tests__',
    projectName,
  };
}

/**
 * Save API key to project's .env file (secure storage)
 *
 * SECURITY: API keys are stored in .env which should be gitignored,
 * not in .satrc which may be committed to version control.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  // Read existing .env content if it exists
  if (await fs.pathExists(envPath)) {
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      // Start fresh if file is corrupted
    }
  }

  // Update or add GROQ_API_KEY
  const keyPattern = /^GROQ_API_KEY=.*/m;
  const newKeyLine = `GROQ_API_KEY=${apiKey}`;

  if (keyPattern.test(envContent)) {
    // Replace existing key
    envContent = envContent.replace(keyPattern, newKeyLine);
  } else {
    // Add new key (with newline if content exists)
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += newKeyLine + '\n';
  }

  await fs.writeFile(envPath, envContent, 'utf-8');

  // Ensure .env is in .gitignore
  await ensureEnvInGitignore();
}

/**
 * Ensure .env is listed in .gitignore for security
 */
async function ensureEnvInGitignore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  try {
    let content = '';
    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf-8');
    }

    // Check if .env is already in .gitignore
    if (!/^\.env$/m.test(content)) {
      // Add .env to .gitignore
      if (content && !content.endsWith('\n')) {
        content += '\n';
      }
      content += '\n# Environment variables (contains secrets)\n.env\n';
      await fs.writeFile(gitignorePath, content, 'utf-8');
    }
  } catch {
    // Ignore errors - .gitignore update is best-effort
  }
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
  const config = await loadConfig();
  return !!config.groqApiKey;
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Groq API keys typically start with 'gsk_' and are fairly long
  return key.startsWith('gsk_') && key.length > 20;
}
