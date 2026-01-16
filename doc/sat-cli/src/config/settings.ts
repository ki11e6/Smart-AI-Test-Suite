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
  groqApiKey?: string;
}

/**
 * Load configuration from multiple sources:
 * 1. Environment variables (highest priority)
 * 2. .satrc in current project directory
 * 3. Default values
 */
export async function loadConfig(): Promise<SATConfig> {
  // Environment variables
  const envKey = process.env.GROQ_API_KEY;
  const envModel = process.env.SAT_MODEL;

  // Project .satrc file
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
    groqApiKey: envKey || fileConfig.groqApiKey,
    model: envModel || 'llama-3.3-70b-versatile',
    framework: fileConfig.framework || 'jest',
    testDir: fileConfig.testDir || '__tests__',
    projectName,
  };
}

/**
 * Save API key to project's .satrc file
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  const satrcPath = path.join(process.cwd(), '.satrc');
  let config: Partial<ProjectConfig> = {};

  if (await fs.pathExists(satrcPath)) {
    try {
      config = await fs.readJson(satrcPath);
    } catch {
      // Start fresh if file is corrupted
    }
  }

  config.groqApiKey = apiKey;
  await fs.writeJson(satrcPath, config, { spaces: 2 });
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
