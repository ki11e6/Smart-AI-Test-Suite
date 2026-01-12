import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export function initCommand(program: Command) {
  program
    .command('init')
    .description('Initialize SAT in the current project')
    .action(async () => {
      try {
        const configPath = path.join(process.cwd(), '.satrc');
        const packageJsonPath = path.join(process.cwd(), 'package.json');

        // Check if already initialized
        if (await fs.pathExists(configPath)) {
          console.log(chalk.yellow('SAT is already initialized in this project.'));
          return;
        }

        // Detect test framework
        let framework = 'jest';
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath);
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (deps.vitest) {
            framework = 'vitest';
          } else if (deps.mocha) {
            framework = 'mocha';
          }
        }

        // Create config
        const config = {
          framework,
          testDir: '__tests__',
          testFilePattern: '{name}.test.ts'
        };

        await fs.writeJson(configPath, config, { spaces: 2 });

        console.log(chalk.green('✓ SAT initialized successfully!'));
        console.log(chalk.cyan(`  Framework: ${framework}`));
        console.log(chalk.cyan(`  Test directory: ${config.testDir}`));
        console.log(chalk.gray('\n  Run `sat gen unit <file>` to generate your first test.'));
      } catch (error) {
        console.error(chalk.red('Error initializing SAT:'), error);
        process.exit(1);
      }
    });
}

