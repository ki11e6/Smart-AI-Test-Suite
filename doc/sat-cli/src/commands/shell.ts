import readline from 'readline';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import ora from 'ora';

import { printBanner } from '../ui/banner';
import {
  satPrompt,
  satInfo,
  satSuccess,
  satWarn,
  satError,
  satDim
} from '../ui/logger';
import { generateTestsWithAI, analyzeProjectWithAI, isGroqConfigured, suggestTestsWithAI } from '../ai/groq';
import { loadConfig, saveApiKey, isValidApiKeyFormat } from '../config/settings';
import {
  scanProject,
  saveProjectContext,
  loadProjectContext,
  buildContextSummary,
  ProjectContext
} from '../core/project-scanner';
import { analyzeCode } from '../core/analyzer';

// In-memory project context
let projectContext: ProjectContext | null = null;

export function shellCommand(program: any) {
  program
    .command('shell')
    .description('Start SAT interactive session')
    .action(startShell);
}

export async function startShell() {
  // Print banner and context
  printBanner(process.cwd());

  // Check if API key is configured
  const hasKey = await isGroqConfigured();
  if (!hasKey) {
    satWarn('GROQ_API_KEY not configured. AI features will be limited.');
    satInfo(`Run ${chalk.magenta('setup')} to configure your API key.\n`);
  }

  // Try to load existing project context
  projectContext = await loadProjectContext(process.cwd());
  if (projectContext) {
    satSuccess('Loaded existing project context');
    satDim(`   Last scanned: ${projectContext.scannedAt}\n`);
  }

  satSuccess('SAT interactive mode started');
  satInfo(`Type ${chalk.magenta('help')} to see commands\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: satPrompt
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    const [command, ...args] = input.split(' ');

    if (!input) {
      rl.prompt();
      return;
    }

    try {
      switch (command.toLowerCase()) {
        case 'exit':
        case 'quit':
          satWarn('Exiting SAT session 👋');
          rl.close();
          process.exit(0);

        case 'help':
          showHelp();
          break;

        case 'setup':
          await handleSetup(rl);
          break;

        case 'learn':
          await handleLearn();
          break;

        case 'generate':
          await handleGenerate(args.join(' '));
          break;

        case 'suggest':
          await handleSuggest(args.join(' '));
          break;

        case 'status':
          await handleStatus();
          break;

        case 'clear':
          console.clear();
          printBanner(process.cwd());
          break;

        default:
          satWarn(`Unknown command: ${chalk.white(command)}`);
          satInfo(`Type ${chalk.magenta('help')} to see available commands`);
      }
    } catch (error: any) {
      satError(error.message || 'An error occurred');
      if (process.env.DEBUG) {
        console.error(error);
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
${chalk.cyan.bold('━━━ SAT Commands ━━━')}

  ${chalk.magenta.bold('learn')}
    ${chalk.gray('Analyze your project and build AI context')}
    ${chalk.gray('Creates .sat/context.json with project insights')}

  ${chalk.magenta.bold('generate')} ${chalk.blue('<file>')}
    ${chalk.gray('Generate AI-powered tests for a specific file')}
    ${chalk.gray('Example: generate src/utils/validator.ts')}

  ${chalk.magenta.bold('generate --all')}
    ${chalk.gray('Generate tests for all source files')}

  ${chalk.magenta.bold('suggest')} ${chalk.blue('<file>')}
    ${chalk.gray('Suggest missing test cases for a file')}

  ${chalk.magenta.bold('status')}
    ${chalk.gray('Show current project context and configuration')}

  ${chalk.magenta.bold('setup')}
    ${chalk.gray('Configure your GROQ API key')}

  ${chalk.magenta.bold('clear')}
    ${chalk.gray('Clear the screen')}

  ${chalk.magenta.bold('exit')}
    ${chalk.gray('Exit SAT session')}

${chalk.cyan.bold('━━━ Workflow ━━━')}

  ${chalk.gray('1.')} ${chalk.white('sat shell')}       ${chalk.gray('→ Start interactive mode')}
  ${chalk.gray('2.')} ${chalk.white('learn')}           ${chalk.gray('→ Analyze your project')}
  ${chalk.gray('3.')} ${chalk.white('generate <file>')} ${chalk.gray('→ Create AI-powered tests')}
  ${chalk.gray('4.')} ${chalk.white('exit')}            ${chalk.gray('→ Run tests with: sat test')}
`);
}

/**
 * Handle setup command - configure API key
 */
async function handleSetup(rl: readline.Interface): Promise<void> {
  return new Promise((resolve) => {
    satInfo('GROQ API Key Setup');
    satDim('Get your key at: https://console.groq.com/keys\n');

    rl.question(chalk.cyan('Enter your GROQ API key: '), async (apiKey) => {
      const key = apiKey.trim();

      if (!key) {
        satWarn('Setup cancelled');
        resolve();
        return;
      }

      if (!isValidApiKeyFormat(key)) {
        satWarn('Invalid API key format. Keys should start with "gsk_"');
        resolve();
        return;
      }

      try {
        await saveApiKey(key);
        satSuccess('API key saved to .satrc');
        satInfo('You can now use AI-powered features!');
      } catch (error: any) {
        satError(`Failed to save: ${error.message}`);
      }

      resolve();
    });
  });
}

/**
 * Handle learn command - scan and analyze project
 */
async function handleLearn(): Promise<void> {
  const spinner = ora({
    text: 'Scanning project structure...',
    color: 'cyan'
  }).start();

  try {
    const cwd = process.cwd();

    // Scan project
    spinner.text = 'Analyzing files...';
    projectContext = await scanProject(cwd);

    spinner.text = 'Building AI context...';

    // Check if AI is available for enhanced analysis
    const hasAI = await isGroqConfigured();

    if (hasAI) {
      spinner.text = 'Running AI analysis...';

      // Build a summary for AI
      const projectSummary = `
Project: ${projectContext.projectName}
Dependencies: ${projectContext.dependencies.slice(0, 20).join(', ')}
DevDependencies: ${projectContext.devDependencies.slice(0, 20).join(', ')}

File Structure (${projectContext.structure.totalFiles} files):
${projectContext.structure.directories.slice(0, 20).join('\n')}

Key Files:
${projectContext.files.slice(0, 15).map(f =>
        `- ${f.relativePath}: exports [${f.exports.join(', ')}]`
      ).join('\n')}
`;

      try {
        const aiAnalysis = await analyzeProjectWithAI(projectSummary);

        if (!aiAnalysis.parseError) {
          // Merge AI insights with scanned data
          if (aiAnalysis.stack) {
            projectContext.stack = [...new Set([...projectContext.stack, ...aiAnalysis.stack])];
          }
          if (aiAnalysis.patterns) {
            projectContext.patterns = { ...projectContext.patterns, ...aiAnalysis.patterns };
          }
          if (aiAnalysis.recommendations) {
            (projectContext as any).aiRecommendations = aiAnalysis.recommendations;
          }
        }
      } catch (aiError) {
        // AI analysis failed, continue with basic analysis
        spinner.text = 'AI analysis unavailable, using basic analysis...';
      }
    }

    // Save context
    const contextPath = await saveProjectContext(cwd, projectContext);

    spinner.succeed('Project learned successfully!');

    // Display summary
    console.log('');
    satInfo(`${chalk.bold('Project:')} ${projectContext.projectName}`);
    satInfo(`${chalk.bold('Stack:')} ${projectContext.stack.join(', ')}`);
    satInfo(`${chalk.bold('Testing:')} ${projectContext.testingSetup.framework}`);
    satInfo(`${chalk.bold('Files:')} ${projectContext.structure.totalFiles} source files`);
    satInfo(`${chalk.bold('Lines:')} ~${projectContext.structure.totalLines.toLocaleString()}`);

    if (projectContext.testingSetup.hasExistingTests) {
      satSuccess('Existing tests detected');
    } else {
      satWarn('No existing tests found');
    }

    console.log('');
    satDim(`Context saved to: ${contextPath}`);

    if ((projectContext as any).aiRecommendations) {
      console.log('');
      satInfo(chalk.bold('AI Recommendations:'));
      (projectContext as any).aiRecommendations.forEach((rec: string) => {
        satDim(`  • ${rec}`);
      });
    }

    console.log('');
    satInfo(`Run ${chalk.magenta('generate <file>')} to create tests`);

  } catch (error: any) {
    spinner.fail('Failed to analyze project');
    throw error;
  }
}

/**
 * Handle generate command - create tests for file(s)
 */
async function handleGenerate(args: string): Promise<void> {
  if (!args) {
    satWarn('Usage: generate <file> or generate --all');
    return;
  }

  // Check for API key
  const hasAI = await isGroqConfigured();
  if (!hasAI) {
    satError('GROQ API key required for AI generation');
    satInfo(`Run ${chalk.magenta('setup')} to configure your API key`);
    return;
  }

  // Load context if not in memory
  if (!projectContext) {
    projectContext = await loadProjectContext(process.cwd());
    if (!projectContext) {
      satWarn('Project not learned yet');
      satInfo(`Run ${chalk.magenta('learn')} first to analyze your project`);
      return;
    }
  }

  if (args === '--all') {
    await generateAll();
    return;
  }

  await generateSingleFile(args);
}

/**
 * Generate tests for a single file
 */
async function generateSingleFile(filePath: string): Promise<void> {
  const fullPath = path.resolve(filePath);

  if (!await fs.pathExists(fullPath)) {
    satError(`File not found: ${filePath}`);
    return;
  }

  const spinner = ora({
    text: `Generating tests for ${chalk.cyan(filePath)}...`,
    color: 'cyan'
  }).start();

  try {
    // Read source file
    const sourceCode = await fs.readFile(fullPath, 'utf-8');

    // Get static analysis for context
    const analysis = await analyzeCode(fullPath);

    spinner.text = 'AI is generating tests...';

    // Generate with AI
    const testCode = await generateTestsWithAI(sourceCode, {
      framework: projectContext?.testingSetup.framework || 'jest',
      projectContext: projectContext ? buildContextSummary(projectContext) : '[]',
      fileName: path.basename(filePath),
    });

    // Clean up the response (remove markdown if present)
    let cleanedCode = testCode;
    if (cleanedCode.startsWith('```')) {
      cleanedCode = cleanedCode
        .replace(/^```(?:typescript|javascript|ts|js)?\n?/i, '')
        .replace(/\n?```$/i, '');
    }

    // Determine output path
    const testDir = path.join(path.dirname(fullPath), '__tests__');
    const sourceFileName = path.basename(fullPath);
    const testFileName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '.test.ts');
    const testFilePath = path.join(testDir, testFileName);

    // Ensure test directory exists
    await fs.ensureDir(testDir);

    // Write test file
    await fs.writeFile(testFilePath, cleanedCode);

    spinner.succeed(`Generated: ${chalk.cyan(testFilePath)}`);

    // Show summary
    if (analysis) {
      const funcCount = analysis.functions.filter(f => f.isExported).length;
      const classCount = analysis.classes.length;
      satDim(`   Covered: ${funcCount} functions, ${classCount} classes`);
    }

  } catch (error: any) {
    spinner.fail('Generation failed');
    throw error;
  }
}

/**
 * Generate tests for all source files
 */
async function generateAll(): Promise<void> {
  const spinner = ora({
    text: 'Finding source files...',
    color: 'cyan'
  }).start();

  try {
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: process.cwd(),
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
    });

    spinner.succeed(`Found ${files.length} source files`);

    let generated = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = `[${i + 1}/${files.length}]`;

      try {
        const progressSpinner = ora({
          text: `${progress} Generating: ${file}`,
          color: 'cyan'
        }).start();

        const fullPath = path.resolve(file);
        const sourceCode = await fs.readFile(fullPath, 'utf-8');

        // Skip very small files
        if (sourceCode.split('\n').length < 5) {
          progressSpinner.info(`${progress} Skipped (too small): ${file}`);
          continue;
        }

        const testCode = await generateTestsWithAI(sourceCode, {
          framework: projectContext?.testingSetup.framework || 'jest',
          projectContext: projectContext ? buildContextSummary(projectContext) : '[]',
          fileName: path.basename(file),
        });

        // Clean markdown
        let cleanedCode = testCode;
        if (cleanedCode.startsWith('```')) {
          cleanedCode = cleanedCode
            .replace(/^```(?:typescript|javascript|ts|js)?\n?/i, '')
            .replace(/\n?```$/i, '');
        }

        const testDir = path.join(path.dirname(fullPath), '__tests__');
        const testFileName = path.basename(file).replace(/\.(ts|tsx|js|jsx)$/, '.test.ts');
        const testFilePath = path.join(testDir, testFileName);

        await fs.ensureDir(testDir);
        await fs.writeFile(testFilePath, cleanedCode);

        progressSpinner.succeed(`${progress} Generated: ${testFileName}`);
        generated++;

      } catch (error: any) {
        failed++;
        satWarn(`${progress} Failed: ${file} - ${error.message}`);
      }
    }

    console.log('');
    satSuccess(`Generated tests for ${generated} files`);
    if (failed > 0) {
      satWarn(`Failed: ${failed} files`);
    }
    satInfo(`Run ${chalk.magenta('sat test')} to execute tests`);

  } catch (error: any) {
    spinner.fail('Generation failed');
    throw error;
  }
}

/**
 * Handle suggest command - suggest missing tests
 */
async function handleSuggest(filePath: string): Promise<void> {
  if (!filePath) {
    satWarn('Usage: suggest <file>');
    return;
  }

  const hasAI = await isGroqConfigured();
  if (!hasAI) {
    satError('GROQ API key required');
    satInfo(`Run ${chalk.magenta('setup')} to configure your API key`);
    return;
  }

  const fullPath = path.resolve(filePath);

  if (!await fs.pathExists(fullPath)) {
    satError(`File not found: ${filePath}`);
    return;
  }

  const spinner = ora({
    text: 'Analyzing for missing tests...',
    color: 'cyan'
  }).start();

  try {
    const sourceCode = await fs.readFile(fullPath, 'utf-8');

    // Check for existing tests
    const testDir = path.join(path.dirname(fullPath), '__tests__');
    const testFileName = path.basename(filePath).replace(/\.(ts|tsx|js|jsx)$/, '.test.ts');
    const testFilePath = path.join(testDir, testFileName);

    let existingTests: string | undefined;
    if (await fs.pathExists(testFilePath)) {
      existingTests = await fs.readFile(testFilePath, 'utf-8');
    }

    const suggestions = await suggestTestsWithAI(sourceCode, existingTests);

    spinner.succeed('Analysis complete');

    if (suggestions.parseError) {
      console.log('\n' + suggestions.raw);
    } else {
      console.log('');
      satInfo(chalk.bold('Missing Tests:'));

      if (suggestions.missingTests && suggestions.missingTests.length > 0) {
        suggestions.missingTests.forEach((test: any) => {
          const priority = test.priority === 'high' ? chalk.red('HIGH') :
            test.priority === 'medium' ? chalk.yellow('MED') : chalk.gray('LOW');
          console.log(`\n  ${priority} ${chalk.white(test.function)}`);
          satDim(`      ${test.scenario}`);
          if (test.reason) {
            satDim(`      Reason: ${test.reason}`);
          }
        });
      }

      if (suggestions.criticalGaps && suggestions.criticalGaps.length > 0) {
        console.log('');
        satWarn('Critical Gaps:');
        suggestions.criticalGaps.forEach((gap: string) => {
          satDim(`  • ${gap}`);
        });
      }
    }

  } catch (error: any) {
    spinner.fail('Analysis failed');
    throw error;
  }
}

/**
 * Handle status command - show current configuration
 */
async function handleStatus(): Promise<void> {
  const config = await loadConfig();
  const hasContext = !!projectContext;

  console.log('');
  satInfo(chalk.bold('SAT Configuration'));
  console.log('');

  // API Key status
  if (config.groqApiKey) {
    satSuccess(`API Key: ${chalk.green('Configured')} (${config.groqApiKey.slice(0, 10)}...)`);
  } else {
    satWarn('API Key: Not configured');
  }

  satInfo(`Model: ${config.model}`);
  satInfo(`Framework: ${config.framework}`);
  satInfo(`Test Dir: ${config.testDir}`);

  console.log('');
  satInfo(chalk.bold('Project Context'));
  console.log('');

  if (hasContext && projectContext) {
    satSuccess(`Loaded: ${projectContext.projectName}`);
    satInfo(`Stack: ${projectContext.stack.join(', ')}`);
    satInfo(`Files: ${projectContext.structure.totalFiles}`);
    satInfo(`Scanned: ${projectContext.scannedAt}`);
  } else {
    satWarn('Not loaded - run `learn` to analyze project');
  }

  console.log('');
}
