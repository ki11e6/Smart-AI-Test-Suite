import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { generateTest } from '../core/generator';
import { analyzeCode } from '../core/analyzer';

export function genCommand(program: Command) {
  program
    .command('gen')
    .description('Generate test files')
    .argument('<type>', 'Test type (unit, integration, etc.)')
    .argument('<file>', 'Source file to generate tests for')
    .option('-o, --output <dir>', 'Output directory for test files')
    .action(async (type: string, file: string, options: { output?: string }) => {
      try {
        if (type !== 'unit') {
          console.log(chalk.yellow(`Test type "${type}" not yet supported. Only "unit" is available.`));
          return;
        }

        const filePath = path.resolve(file);
        console.log(chalk.cyan(`Analyzing ${filePath}...`));

        // Analyze code
        const analysis = await analyzeCode(filePath);
        
        if (!analysis) {
          console.error(chalk.red('Failed to analyze code.'));
          process.exit(1);
        }

        // Generate test
        const outputDir = options.output || '__tests__';
        const testFile = await generateTest(filePath, analysis, outputDir);

        console.log(chalk.green(`✓ Test file generated: ${testFile}`));
        console.log(chalk.gray(`  Run \`sat test\` to execute the tests.`));
      } catch (error) {
        console.error(chalk.red('Error generating test:'), error);
        process.exit(1);
      }
    });
}

