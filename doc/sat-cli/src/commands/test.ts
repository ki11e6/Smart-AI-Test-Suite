import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

const execAsync = promisify(exec);

export function testCommand(program: Command) {
  program
    .command('test')
    .description('Run tests using the configured test framework')
    .option('-w, --watch', 'Watch mode')
    .action(async (options: { watch?: boolean }) => {
      const configPath = path.join(process.cwd(), '.satrc');
      let config: any = null;
      
      try {
        if (!(await fs.pathExists(configPath))) {
          console.log(chalk.yellow('SAT not initialized. Run `sat init` first.'));
          return;
        }

        config = await fs.readJson(configPath);
        const framework = config.framework || 'jest';

        // Execute test framework
        let command = '';
        if (framework === 'jest') {
          command = options.watch ? 'npx jest --watch' : 'npx jest';
        } else if (framework === 'vitest') {
          command = options.watch ? 'npx vitest --watch' : 'npx vitest run';
        } else if (framework === 'mocha') {
          command = 'npx mocha';
        } else {
          console.error(chalk.red(`Unsupported framework: ${framework}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`Running tests with ${framework}...`));
        const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.error(chalk.red(`Test framework not found. Please install ${config?.framework || 'jest'}.`));
        } else {
          console.error(chalk.red('Error running tests:'), error.message);
        }
        process.exit(1);
      }
    });
}

