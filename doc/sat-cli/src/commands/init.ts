import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

import {
  satSuccess,
  satInfo,
  satWarn,
  satError,
  satDim
} from '../ui/logger';

import { startShell } from './shell';

export function initCommand(program: Command) {
  program
    .command('init')
    .description('Initialize SAT in the current project')
    .action(async () => {
      try {
        const projectRoot = process.cwd();
        const configPath = path.join(projectRoot, '.satrc');
        const packageJsonPath = path.join(projectRoot, 'package.json');

        // 🔹 Already initialized
        if (await fs.pathExists(configPath)) {
          satWarn('SAT is already initialized in this project');
          satDim('Entering interactive mode...\n');
          startShell();
          return;
        }

        // 🔹 Detect test framework
        let framework = 'jest';

        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath);
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          if (deps.vitest) framework = 'vitest';
          else if (deps.mocha) framework = 'mocha';
        }

        // 🔹 Create SAT config
        const config = {
          framework,
          testDir: '__tests__',
          testFilePattern: '{name}.test.ts'
        };

        await fs.writeJson(configPath, config, { spaces: 2 });

        // 🔹 Success output
        satSuccess('SAT initialized successfully');
        satInfo(`Framework       : ${framework}`);
        satInfo(`Test directory  : ${config.testDir}`);
        satDim('Configuration written to .satrc\n');

        satDim('Entering SAT interactive mode...\n');

        // 🔥 Auto-enter interactive session
        startShell();
      } catch (error) {
        satError('Failed to initialize SAT');
        console.error(error);
        process.exit(1);
      }
    });
}
