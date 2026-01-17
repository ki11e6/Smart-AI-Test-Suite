import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

export function coverageCommand(program: Command) {
  program
    .command('coverage')
    .description('Generate and display test coverage report')
    .action(async () => {
      const configPath = path.join(process.cwd(), '.satrc');

      try {
        if (!(await fs.pathExists(configPath))) {
          console.log(chalk.yellow('SAT not initialized. Run `sat init` first.'));
          return;
        }

        const config = await fs.readJson(configPath);
        const framework = config.framework || 'jest';

        // Build coverage command based on framework
        let command = '';
        if (framework === 'jest') {
          command = 'npx jest --coverage';
        } else if (framework === 'vitest') {
          command = 'npx vitest run --coverage';
        } else if (framework === 'mocha') {
          command = 'npx nyc --reporter=text mocha';
        } else {
          console.error(chalk.red(`Unsupported framework: ${framework}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`Generating coverage report with ${framework}...\n`));

        // Use spawn with stdio inherit for real-time streaming output
        const child = spawn(command, [], {
          shell: true,
          cwd: process.cwd(),
          stdio: 'inherit'
        });

        child.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('\n✓ Coverage report generated'));
          } else {
            console.log(chalk.yellow(`\n⚠ Coverage finished with exit code ${code}`));
          }
          process.exit(code || 0);
        });

        child.on('error', (error) => {
          console.error(chalk.red('Failed to start coverage process:'), error.message);
          process.exit(1);
        });

      } catch (error: any) {
        console.error(chalk.red('Error generating coverage:'), error.message);
        process.exit(1);
      }
    });
}

