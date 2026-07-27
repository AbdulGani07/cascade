import pc from "picocolors";

/**
 * Prints a success message to stdout.
 */
export function printSuccess(msg: string): void {
  console.log(pc.green(`✔ ${msg}`));
}

/**
 * Prints a warning message to stdout.
 */
export function printWarning(msg: string): void {
  console.log(pc.yellow(`⚠ ${msg}`));
}

/**
 * Prints an error message to stderr.
 */
export function printError(msg: string): void {
  console.error(pc.red(`✖ ${msg}`));
}

/**
 * Prints a bold section heading with a preceding blank line.
 */
export function printHeading(msg: string): void {
  console.log(`\n${pc.bold(msg)}`);
}
