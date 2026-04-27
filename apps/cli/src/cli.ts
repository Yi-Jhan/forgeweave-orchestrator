import { VERSION } from "./version.js";
import {
  createLocalWorkflowStore,
  genericBugFixWorkflow,
  genericNewFeatureWorkflow,
  recordReviewDecision,
  rerunRejectedStep,
  runProjectOnboarding,
  runWorkflow,
  suggestRerunStep
} from "@forgeweave/core";

export type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

const helpText = `ForgeWeave Orchestrator

Usage: forgeweave [command]

Commands:
  help       Show this help message
  init       Run project onboarding and print an onboarding report summary
  run        Run a workflow, for example: run generic.review
  status     Inspect a persisted workflow run
  artifacts  List persisted workflow artifacts for a run
  review     Approve or reject a waiting manual review gate
  rerun      Rerun a rejected run step using the saved reject reason
  version    Show the CLI version

Options:
  -h, --help       Show this help message
  -v, --version    Show the CLI version

Init options:
  --project-root <path>  Project root to inspect (defaults to current working directory)
  --dry-run              Do not write onboarding artifacts (default)
  --write                Write onboarding artifacts under .forgeweave/onboarding

Review workflow options:
  --project-root <path>  Project root to inspect (defaults to current working directory)
  --output-root <path>   Local ForgeWeave artifact output root
  --run-id <id>          Run id to create or inspect
  --brief <text>         Bug brief or requirement text for patch workflows
  --target-file <path>   Relative target file for controlled patch workflows
  --reason <text>        Required rejection reason`;

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

function requiredOption(argv: readonly string[], option: string): string {
  const value = optionValue(argv, option);
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required option: ${option}`);
  }
  return value;
}

async function renderRunSummary(argv: readonly string[]): Promise<string> {
  const [workflowId] = argv;
  if (workflowId !== "generic.review" && workflowId !== "generic.bug-fix" && workflowId !== "generic.new-feature") {
    throw new Error(`Unsupported workflow: ${workflowId ?? "<missing>"}`);
  }

  const projectRoot = optionValue(argv, "--project-root") ?? process.cwd();
  const outputRoot = requiredOption(argv, "--output-root");
  const runId = optionValue(argv, "--run-id");
  const result = await runWorkflow({
    projectRoot,
    outputRoot,
    runId,
    workflow:
      workflowId === "generic.bug-fix"
        ? genericBugFixWorkflow
        : workflowId === "generic.new-feature"
          ? genericNewFeatureWorkflow
          : undefined,
    brief: optionValue(argv, "--brief"),
    targetFile: optionValue(argv, "--target-file")
  });

  return [
    `Run: ${result.run.runId}`,
    `Workflow: ${result.run.workflowId}`,
    `Status: ${result.run.status}`,
    `Artifacts: ${result.artifacts.map((artifact) => artifact.artifactId).join(", ")}`,
    `Review decision: ${result.reviewDecision.status}`
  ].join("\n");
}

function renderStatusSummary(argv: readonly string[]): string {
  const outputRoot = requiredOption(argv, "--output-root");
  const runId = requiredOption(argv, "--run-id");
  const store = createLocalWorkflowStore(outputRoot);
  const run = store.loadRun(runId);
  const steps = store.loadSteps(runId);
  const reviewDecision = store.loadReviewDecision(runId);
  const artifacts = store.listArtifacts(runId);
  const failedSteps = steps.filter((step) => step.status === "failed").map((step) => step.stepId);
  const recovery =
    run.status === "rejected" && reviewDecision.reason !== undefined
      ? `Recovery: forgeweave rerun --output-root ${outputRoot} --run-id ${runId} --step-id ${suggestRerunStep(reviewDecision.reason)}`
      : undefined;

  return [
    `Run: ${run.runId}`,
    `Workflow: ${run.workflowId}`,
    `Status: ${run.status}`,
    `Steps: ${steps.map((step) => `${step.stepId}:${step.status}`).join(", ")}`,
    `Review decision: ${reviewDecision.status}${reviewDecision.reason ? ` (${reviewDecision.reason})` : ""}`,
    `Artifacts: ${artifacts.map((artifact) => `${artifact.artifactId}:${artifact.kind}`).join(", ")}`,
    failedSteps.length > 0 ? `Failed steps: ${failedSteps.join(", ")}` : undefined,
    recovery
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function renderArtifactsSummary(argv: readonly string[]): string {
  const outputRoot = requiredOption(argv, "--output-root");
  const runId = requiredOption(argv, "--run-id");
  const artifacts = createLocalWorkflowStore(outputRoot).listArtifacts(runId);

  return [
    `Run: ${runId}`,
    `Artifacts: ${artifacts.length}`,
    ...artifacts.map((artifact) => `${artifact.artifactId} ${artifact.kind} ${artifact.status}`)
  ].join("\n");
}

function renderReviewSummary(argv: readonly string[]): string {
  const [action] = argv;
  if (action !== "approve" && action !== "reject") {
    throw new Error(`Unsupported review action: ${action ?? "<missing>"}`);
  }

  const outputRoot = requiredOption(argv, "--output-root");
  const runId = requiredOption(argv, "--run-id");
  const reason = optionValue(argv, "--reason");
  const result = recordReviewDecision({
    outputRoot,
    runId,
    decision: action,
    reason
  });

  return [
    `Run: ${runId}`,
    `Status: ${result.runStatus}`,
    `Review decision: ${result.decision.status}${result.decision.reason ? ` (${result.decision.reason})` : ""}`
  ].join("\n");
}

function renderRerunSummary(argv: readonly string[]): string {
  const outputRoot = requiredOption(argv, "--output-root");
  const runId = requiredOption(argv, "--run-id");
  const stepId = optionValue(argv, "--step-id");
  const result = rerunRejectedStep({ outputRoot, runId, stepId });

  return [
    `Run: ${result.runId}`,
    `Rerun step: ${result.stepId}`,
    `Reject reason: ${result.rejectReason}`,
    `Artifacts: ${result.artifacts.map((artifact) => `${artifact.artifactId}:${artifact.kind}`).join(", ")}`
  ].join("\n");
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  io: CliIo = { stdout: console.log, stderr: console.error },
): Promise<number> {
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

  if (command === "run") {
    try {
      io.stdout(await renderRunSummary(argv.slice(1)));
      return 0;
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command === "status") {
    try {
      io.stdout(renderStatusSummary(argv.slice(1)));
      return 0;
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command === "artifacts") {
    try {
      io.stdout(renderArtifactsSummary(argv.slice(1)));
      return 0;
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command === "review") {
    try {
      io.stdout(renderReviewSummary(argv.slice(1)));
      return 0;
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command === "rerun") {
    try {
      io.stdout(renderRerunSummary(argv.slice(1)));
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
