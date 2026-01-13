import readline from 'readline';
import chalk from 'chalk';

import { printBanner } from '../ui/banner';
import {
    satPrompt,
    satInfo,
    satSuccess,
    satWarn
} from '../ui/logger';

export function shellCommand(program: any) {
    program
        .command('shell')
        .description('Start SAT interactive session')
        .action(startShell);
}

export function startShell() {
    // 🔹 Banner + context
    printBanner(process.cwd());

    satSuccess('SAT interactive mode started');
    satInfo(`Type ${chalk.magenta('help')} to see commands\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: satPrompt
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (!input) {
            rl.prompt();
            return;
        }

        if (input === 'exit') {
            satWarn('Exiting SAT session 👋');
            rl.close();
            return;
        }

        if (input === 'help') {
            console.log(`
${chalk.cyan.bold('Available Commands')}

  ${chalk.magenta('generate-unit')} ${chalk.blue('<file>')}
    Generate a Jest unit test file

  ${chalk.magenta('suggest-tests')} ${chalk.blue('<file>')}
    Suggest missing test cases

  ${chalk.magenta('exit')}
    Exit SAT session
`);
            rl.prompt();
            return;
        }

        // 🔹 Unknown command
        satWarn(`Unknown command: ${chalk.white(input)}`);        
        rl.prompt();
    });
}
