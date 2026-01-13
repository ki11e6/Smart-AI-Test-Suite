import chalk from 'chalk';
import path from 'path';

export function printBanner(projectPath: string) {
    const projectName = path.basename(projectPath);

    console.log(
        chalk.cyan.bold(`
╔══════════════════════════════════════╗
║   🧠 SAT — Smart AI Test Assistant   ║
╚══════════════════════════════════════╝
`)
    );

    console.log(
        chalk.blue(`📁 Project : ${chalk.white(projectName)}`)
    );

    console.log(
        chalk.gray(`📍 Path    : ${projectPath}\n`)
    );
}
