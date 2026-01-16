#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the CLI tool's directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Also try to load from current working directory
dotenv.config();

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { genCommand } from './commands/gen';
import { testCommand } from './commands/test';
import { coverageCommand } from './commands/coverage';
import { shellCommand } from './commands/shell';

const program = new Command();

program
  .name('sat')
  .description('Smart AI Test Suite - AI-powered automated test generation')
  .version('0.2.0');

// Register commands
initCommand(program);
genCommand(program);
testCommand(program);
coverageCommand(program);
shellCommand(program);

program.parse();

