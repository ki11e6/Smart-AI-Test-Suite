import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

export function testCommand(program: Command) {
  program
    .command('test')
    .description('Run tests using the configured test framework')
    .option('-w, --watch', 'Watch mode')
    .argument('[pattern]', 'Optional file pattern to run specific tests')
    .action(async (pattern: string | undefined, options: { watch?: boolean }) => {
      const configPath = path.join(process.cwd(), '.satrc');

      try {
        if (!(await fs.pathExists(configPath))) {
          console.log(chalk.yellow('SAT not initialized. Run `sat init` first.'));
          return;
        }

        const config = await fs.readJson(configPath);
        const framework = config.framework || 'jest';

        // Build test command based on framework
        let command = '';
        if (framework === 'jest') {
          command = 'npx jest';
          if (options.watch) command += ' --watch';
          if (pattern) command += ` "${pattern}"`;
        } else if (framework === 'vitest') {
          command = options.watch ? 'npx vitest --watch' : 'npx vitest run';
          if (pattern) command += ` "${pattern}"`;
        } else if (framework === 'mocha') {
          command = 'npx mocha';
          if (pattern) command += ` "${pattern}"`;
        } else {
          console.error(chalk.red(`Unsupported framework: ${framework}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`Running tests with ${framework}...`));
        if (options.watch) {
          console.log(chalk.gray('Watch mode enabled. Press Ctrl+C to exit.\n'));
        }

        // Use spawn with stdio inherit for real-time streaming output
        // This ensures test results are displayed as they run
        const child = spawn(command, [], {
          shell: true,
          cwd: process.cwd(),
          stdio: 'inherit'
        });

        child.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('\n✓ Tests completed successfully'));
          } else {
            console.log(chalk.yellow(`\n⚠ Tests finished with exit code ${code}`));
          }
          process.exit(code || 0);
        });

        child.on('error', (error) => {
          console.error(chalk.red('Failed to start test process:'), error.message);
          process.exit(1);
        });

      } catch (error: any) {
        console.error(chalk.red('Error running tests:'), error.message);
        process.exit(1);
      }
    });
}

