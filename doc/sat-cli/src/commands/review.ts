import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { reviewTestsWithAI, isGroqConfigured } from '../ai/groq';

export function reviewCommand(program: Command) {
  program
    .command('review')
    .description('Review test quality and get improvement suggestions')
    .argument('<file>', 'Test file to review')
    .option('--json', 'Output raw JSON result')
    .action(async (file: string, options: { json?: boolean }) => {
      try {
        // Check API key
        const hasAI = await isGroqConfigured();
        if (!hasAI) {
          console.error(chalk.red('GROQ API key required for review.'));
          console.log(chalk.gray('Run `sat shell` then `setup` to configure your API key.'));
          process.exit(1);
        }

        const filePath = path.resolve(file);

        if (!await fs.pathExists(filePath)) {
          console.error(chalk.red(`File not found: ${file}`));
          process.exit(1);
        }

        // Validate it looks like a test file
        const fileName = path.basename(filePath);
        if (!fileName.includes('.test.') && !fileName.includes('.spec.')) {
          console.log(chalk.yellow(`Warning: ${fileName} doesn't appear to be a test file.`));
        }

        const spinner = ora({
          text: `Reviewing ${chalk.cyan(fileName)}...`,
          color: 'cyan'
        }).start();

        const testCode = await fs.readFile(filePath, 'utf-8');

        spinner.text = 'AI is analyzing test quality...';
        const review = await reviewTestsWithAI(testCode);

        spinner.succeed('Review complete');

        if (options.json) {
          console.log(JSON.stringify(review, null, 2));
          return;
        }

        if (review.parseError) {
          console.log('\n' + review.raw);
          return;
        }

        // Display formatted review
        console.log('');

        // Score with color
        const score = review.score || 0;
        const scoreColor = score >= 8 ? chalk.green : score >= 5 ? chalk.yellow : chalk.red;
        console.log(`${chalk.bold('Quality Score:')} ${scoreColor.bold(score + '/10')}`);

        // Strengths
        if (review.strengths && review.strengths.length > 0) {
          console.log('');
          console.log(chalk.green.bold('✓ Strengths:'));
          review.strengths.forEach((s: string) => {
            console.log(chalk.green(`  • ${s}`));
          });
        }

        // Weaknesses
        if (review.weaknesses && review.weaknesses.length > 0) {
          console.log('');
          console.log(chalk.red.bold('✗ Weaknesses:'));
          review.weaknesses.forEach((w: string) => {
            console.log(chalk.red(`  • ${w}`));
          });
        }

        // Suggestions
        if (review.suggestions && review.suggestions.length > 0) {
          console.log('');
          console.log(chalk.cyan.bold('💡 Suggestions:'));
          review.suggestions.forEach((suggestion: any) => {
            const priority = suggestion.priority === 'high' ? chalk.red('[HIGH]') :
              suggestion.priority === 'medium' ? chalk.yellow('[MED]') : chalk.gray('[LOW]');
            console.log(`  ${priority} ${chalk.white(suggestion.issue)}`);
            if (suggestion.fix) {
              console.log(chalk.gray(`      Fix: ${suggestion.fix}`));
            }
          });
        }

        // Coverage assessment
        if (review.coverageAssessment) {
          console.log('');
          console.log(chalk.bold('Coverage Assessment:'));
          console.log(chalk.gray(`  ${review.coverageAssessment}`));
        }

        console.log('');
        console.log(chalk.gray(`Run \`sat fix ${file}\` to auto-fix issues.`));

      } catch (error: any) {
        console.error(chalk.red('Review failed:'), error.message);
        process.exit(1);
      }
    });
}
