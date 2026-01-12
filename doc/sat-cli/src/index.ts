#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { genCommand } from './commands/gen';
import { testCommand } from './commands/test';
import { coverageCommand } from './commands/coverage';

const program = new Command();

program
  .name('sat')
  .description('Smart AI Test Suite - Automated test generation and execution')
  .version('0.1.0');

// Register commands
initCommand(program);
genCommand(program);
testCommand(program);
coverageCommand(program);

program.parse();

