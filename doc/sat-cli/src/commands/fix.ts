import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { fixTestsWithAI, isGroqConfigured } from '../ai/groq';

export function fixCommand(program: Command) {
  program
    .command('fix')
    .description('Auto-fix failing tests using AI')
    .argument('<file>', 'Test file to fix')
    .option('-e, --error <message>', 'Error message (auto-detected if not provided)')
    .option('-s, --source <file>', 'Source file the test is for')
    .option('--dry-run', 'Show fixed code without writing')
    .action(async (file: string, options: { error?: string; source?: string; dryRun?: boolean }) => {
      try {
        // Check API key
        const hasAI = await isGroqConfigured();
        if (!hasAI) {
          console.error(chalk.red('GROQ API key required for fix.'));
          console.log(chalk.gray('Run `sat shell` then `setup` to configure your API key.'));
          process.exit(1);
        }

        const testFilePath = path.resolve(file);

        if (!await fs.pathExists(testFilePath)) {
          console.error(chalk.red(`File not found: ${file}`));
          process.exit(1);
        }

        const spinner = ora({
          text: 'Analyzing test file...',
          color: 'cyan'
        }).start();

        const testCode = await fs.readFile(testFilePath, 'utf-8');

        // Get error message - either provided or try to run the test
        let errorMessage = options.error;

        if (!errorMessage) {
          spinner.text = 'Running test to detect errors...';
          try {
            // Try to run the specific test file and capture errors
            execSync(`npx jest "${testFilePath}" --no-coverage 2>&1`, {
              encoding: 'utf-8',
              cwd: process.cwd(),
              timeout: 60000,
            });
            spinner.succeed('Tests passed! No fix needed.');
            return;
          } catch (execError: any) {
            // Test failed - capture the error output
            errorMessage = execError.stdout || execError.stderr || execError.message;

            // Truncate if too long
            if (errorMessage && errorMessage.length > 3000) {
              errorMessage = errorMessage.slice(0, 3000) + '\n... [truncated]';
            }
          }
        }

        if (!errorMessage) {
          spinner.fail('Could not detect test errors.');
          console.log(chalk.gray('Provide error message with --error flag'));
          process.exit(1);
        }

        // Try to find the source file
        let sourceCode: string | undefined;
        if (options.source) {
          const sourcePath = path.resolve(options.source);
          if (await fs.pathExists(sourcePath)) {
            sourceCode = await fs.readFile(sourcePath, 'utf-8');
          }
        } else {
          // Try to infer source file from test file name
          const testFileName = path.basename(testFilePath);
          const sourceFileName = testFileName
            .replace('.test.ts', '.ts')
            .replace('.test.tsx', '.tsx')
            .replace('.test.js', '.js')
            .replace('.test.jsx', '.jsx')
            .replace('.spec.ts', '.ts')
            .replace('.spec.tsx', '.tsx')
            .replace('.spec.js', '.js')
            .replace('.spec.jsx', '.jsx');

          // Look for source file in parent directory
          const testDir = path.dirname(testFilePath);
          const possibleSourcePaths = [
            path.join(testDir, '..', sourceFileName),
            path.join(testDir, sourceFileName),
          ];

          for (const sourcePath of possibleSourcePaths) {
            if (await fs.pathExists(sourcePath)) {
              sourceCode = await fs.readFile(sourcePath, 'utf-8');
              spinner.text = `Found source: ${path.basename(sourcePath)}`;
              break;
            }
          }
        }

        spinner.text = 'AI is fixing the tests...';
        const fixedCode = await fixTestsWithAI(testCode, errorMessage, sourceCode);

        // Clean up markdown if present
        let cleanedCode = fixedCode;
        if (cleanedCode.startsWith('```')) {
          cleanedCode = cleanedCode
            .replace(/^```(?:typescript|javascript|ts|js)?\n?/i, '')
            .replace(/\n?```$/i, '');
        }

        spinner.succeed('Fix generated');

        if (options.dryRun) {
          console.log('');
          console.log(chalk.cyan.bold('Fixed code (dry run):'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(cleanedCode);
          console.log(chalk.gray('─'.repeat(50)));
          console.log('');
          console.log(chalk.gray('Run without --dry-run to apply changes.'));
          return;
        }

        // Backup original file
        const backupPath = testFilePath + '.backup';
        await fs.copyFile(testFilePath, backupPath);

        // Write fixed code
        await fs.writeFile(testFilePath, cleanedCode);

        console.log(chalk.green(`✓ Fixed: ${file}`));
        console.log(chalk.gray(`  Backup saved to: ${path.basename(backupPath)}`));
        console.log('');
        console.log(chalk.gray('Run `sat test` to verify the fix.'));

      } catch (error: any) {
        console.error(chalk.red('Fix failed:'), error.message);
        process.exit(1);
      }
    });
}
