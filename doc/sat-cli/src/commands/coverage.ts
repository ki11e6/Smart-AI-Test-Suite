import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

const execAsync = promisify(exec);

export function coverageCommand(program: Command) {
  program
    .command('coverage')
    .description('Generate and display test coverage report')
    .action(async () => {
      const configPath = path.join(process.cwd(), '.satrc');
      let config: any = null;
      
      try {
        if (!(await fs.pathExists(configPath))) {
          console.log(chalk.yellow('SAT not initialized. Run `sat init` first.'));
          return;
        }

        config = await fs.readJson(configPath);
        const framework = config.framework || 'jest';

        // Execute coverage command
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

        console.log(chalk.cyan(`Generating coverage report with ${framework}...`));
        const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.error(chalk.red(`Test framework not found. Please install ${config?.framework || 'jest'}.`));
        } else {
          console.error(chalk.red('Error generating coverage:'), error.message);
        }
        process.exit(1);
      }
    });
}

