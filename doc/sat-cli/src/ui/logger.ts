import chalk from 'chalk';

export const satPrompt = chalk.magenta.bold('SAT ❯ ');

export function satInfo(message: string) {
    console.log(chalk.white(message));
}

export function satSuccess(message: string) {
    console.log(chalk.green('✔ ') + chalk.greenBright(message));
}

export function satWarn(message: string) {
    console.log(chalk.yellow('⚠ ') + chalk.yellowBright(message));
}

export function satError(message: string) {
    console.log(chalk.red('✖ ') + chalk.redBright(message));
}

export function satDim(message: string) {
    console.log(chalk.gray(message));
}
