import { VERSION } from "./version.js";
import { runProjectOnboarding } from "@forgeweave/core";

export type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

const helpText = `ForgeWeave Orchestrator

Usage: forgeweave [command]

Commands:
  help       Show this help message
  init       Run project onboarding and print an onboarding report summary
  version    Show the CLI version

Options:
  -h, --help       Show this help message
  -v, --version    Show the CLI version

Init options:
  --project-root <path>  Project root to inspect (defaults to current working directory)
  --dry-run              Do not write onboarding artifacts (default)
  --write                Write onboarding artifacts under .forgeweave/onboarding`;

export function renderHelp(): string {
  return helpText;
}

export function renderVersion(): string {
  return `forgeweave ${VERSION}`;
}

function optionValue(argv: readonly string[], option: string): string | undefined {
  const index = argv.indexOf(option);
  if (index < 0) return undefined;
  return argv[index + 1];
}

function renderInitSummary(argv: readonly string[]): string {
  const projectRoot = optionValue(argv, "--project-root") ?? process.cwd();
  const writeArtifacts = argv.includes("--write");
  const report = runProjectOnboarding({ projectRoot, writeArtifacts });
  const requiredAssetGapCount = report.assetResolutions.flatMap((asset) =>
    asset.gaps.filter((gap) => gap.severity === "required")
  ).length;
  const optionalAssetGapCount = report.assetResolutions.flatMap((asset) =>
    asset.gaps.filter((gap) => gap.severity === "optional")
  ).length;

  return [
    `ForgeWeave init completed for ${report.manifest.manifest.project.id}`,
    `Mode: ${writeArtifacts ? "write" : "dry-run"}`,
    `Adapter: ${report.adapter.recommendedAdapter} (${report.adapter.confidence})`,
    `Signals: language=${report.signals.language}, framework=${report.signals.framework}, packageManager=${report.signals.packageManager}`,
    `Asset gaps: required=${requiredAssetGapCount}, optional=${optionalAssetGapCount}`,
    `Provider preflight: ${report.preflightReports.map((item) => `${item.provider}:${item.status}`).join(", ")}`,
    `Capability matrix: ${report.capabilityMatrix.providers.length} providers`,
    `Context packet: ${report.contextPacket.kind}`,
    `Onboarding report: ${report.kind}`
  ].join("\n");
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

  if (command === "init") {
    try {
      io.stdout(renderInitSummary(argv.slice(1)));
      return 0;
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  io.stderr(`Unknown command: ${command}`);
  io.stderr(renderHelp());
  return 1;
}
