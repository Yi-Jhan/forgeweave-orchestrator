import { VERSION } from "./version.js";

export type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

const helpText = `ForgeWeave Orchestrator

Usage: forgeweave [command]

Commands:
  help       Show this help message
  version    Show the CLI version

Options:
  -h, --help       Show this help message
  -v, --version    Show the CLI version`;

export function renderHelp(): string {
  return helpText;
}

export function renderVersion(): string {
  return `forgeweave ${VERSION}`;
}

export function runCli(
  argv: readonly string[] = process.argv.slice(2),
  io: CliIo = { stdout: console.log, stderr: console.error },
): number {
  const [command] = argv;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    io.stdout(renderHelp());
    return 0;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    io.stdout(renderVersion());
    return 0;
  }

  io.stderr(`Unknown command: ${command}`);
  io.stderr(renderHelp());
  return 1;
}
