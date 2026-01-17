import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { fixTestsWithAI, isGroqConfigured, reviewTestsWithAI, improveTestsWithAI } from '../ai/groq';

export function fixCommand(program: Command) {
  program
    .command('fix')
    .description('Auto-fix or improve tests using AI')
    .argument('<file>', 'Test file to fix')
    .option('-e, --error <message>', 'Error message (auto-detected if not provided)')
    .option('-s, --source <file>', 'Source file the test is for')
    .option('-r, --review', 'Run review first and fix based on suggestions')
    .option('--dry-run', 'Show fixed code without writing')
    .action(async (file: string, options: { error?: string; source?: string; dryRun?: boolean; review?: boolean }) => {
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

        // Try to find the source file first (used by both modes)
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

        let fixedCode: string;

        // Review-based improvement mode
        if (options.review) {
          spinner.text = 'Reviewing test quality...';
          const review = await reviewTestsWithAI(testCode);

          if (review.parseError) {
            spinner.fail('Could not parse review response');
            console.log(review.raw);
            process.exit(1);
          }

          // Display review summary
          spinner.succeed('Review complete');
          const score = review.score || 0;
          const scoreColor = score >= 8 ? chalk.green : score >= 5 ? chalk.yellow : chalk.red;
          console.log(`\n${chalk.bold('Quality Score:')} ${scoreColor.bold(score + '/10')}`);

          if (review.weaknesses && review.weaknesses.length > 0) {
            console.log(chalk.red.bold('\nWeaknesses:'));
            review.weaknesses.forEach((w: string) => console.log(chalk.red(`  • ${w}`)));
          }

          if (review.suggestions && review.suggestions.length > 0) {
            console.log(chalk.cyan.bold('\nSuggestions to apply:'));
            review.suggestions.forEach((s: any) => {
              const priority = s.priority === 'high' ? chalk.red('[HIGH]') :
                s.priority === 'medium' ? chalk.yellow('[MED]') : chalk.gray('[LOW]');
              console.log(`  ${priority} ${s.issue}`);
            });
          }

          if ((!review.weaknesses || review.weaknesses.length === 0) &&
              (!review.suggestions || review.suggestions.length === 0)) {
            console.log(chalk.green('\nNo issues to fix!'));
            return;
          }

          console.log('');
          spinner.start('AI is improving the tests...');
          fixedCode = await improveTestsWithAI(testCode, review, sourceCode);

        } else {
          // Error-based fix mode (original behavior)
          let errorMessage = options.error;

          if (!errorMessage) {
            spinner.text = 'Running test to detect errors...';
            try {
              execSync(`npx jest "${testFilePath}" --no-coverage 2>&1`, {
                encoding: 'utf-8',
                cwd: process.cwd(),
                timeout: 60000,
              });
              spinner.succeed('Tests passed!');
              console.log(chalk.gray('\nUse --review flag to improve test quality based on review.'));
              return;
            } catch (execError: any) {
              errorMessage = execError.stdout || execError.stderr || execError.message;
              if (errorMessage && errorMessage.length > 3000) {
                errorMessage = errorMessage.slice(0, 3000) + '\n... [truncated]';
              }
            }
          }

          if (!errorMessage) {
            spinner.fail('Could not detect test errors.');
            console.log(chalk.gray('Use --error flag or --review flag for quality improvements'));
            process.exit(1);
          }

          spinner.text = 'AI is fixing the tests...';
          fixedCode = await fixTestsWithAI(testCode, errorMessage, sourceCode);
        }

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
