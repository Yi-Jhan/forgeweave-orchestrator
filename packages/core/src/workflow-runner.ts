import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

import type {
  BugBrief,
  DeliverySummary,
  PatchPlan,
  ReviewFindings,
  WorkflowArtifact,
  WorkflowDefinition,
  WorkflowEventEnvelope
} from "@forgeweave/contracts";

import { runValidationCommandSummary } from "./command-runner.js";
import { captureFileChangeSet, snapshotFiles } from "./diff-capture.js";
import { createLocalWorkflowStore, type LocalWorkflowStore } from "./local-store.js";
import { loadOrGenerateProjectManifest } from "./manifest.js";
import { createMockRuntimeProvider } from "./mock-runtime-provider.js";
import { buildOnboardingReport } from "./onboarding-report.js";
import type { AgentRuntimeProvider } from "./runtime-provider.js";
import { transitionRun, transitionStep, type WorkflowRunState, type WorkflowStepState } from "./state-machine.js";
import { defaultFilePolicy, evaluateFilePolicy, resolveInside } from "./write-safety.js";
import { createControlledWorkdir, type ControlledWorkdir } from "./workdir-manager.js";
import { genericBugFixWorkflow } from "./workflows/generic-bug-fix.js";
import { genericReviewWorkflow } from "./workflows/generic-review.js";

export type RunWorkflowOptions = {
  projectRoot: string;
  outputRoot: string;
  runId?: string;
  workflow?: WorkflowDefinition;
  provider?: AgentRuntimeProvider;
  brief?: string;
  targetFile?: string;
  validationCommands?: string[];
};

export type RunWorkflowResult = {
  run: WorkflowRunState;
  steps: WorkflowStepState[];
  artifacts: WorkflowArtifact[];
  reviewDecision: {
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
  store: LocalWorkflowStore;
};

let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `run-${Date.now()}-${runCounter}`;
}

function event(
  runId: string,
  type: WorkflowEventEnvelope["type"],
  payload: Record<string, unknown>,
  stepId?: string,
  artifactId?: string
): WorkflowEventEnvelope {
  return {
    schemaVersion: "1.0.0",
    kind: "workflow-event",
    eventId: `${runId}-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    stepId,
    artifactId,
    type,
    timestamp: new Date().toISOString(),
    payload
  };
}

function artifact(
  runId: string,
  kind: string,
  stepId: string,
  payload: Record<string, unknown>,
  refs: WorkflowArtifact["refs"] = []
): WorkflowArtifact {
  return {
    schemaVersion: "1.0.0",
    kind,
    artifactId: `${runId}-${kind}`,
    runId,
    status: "ready",
    producedBy: {
      stepId
    },
    refs,
    payload,
    createdAt: new Date().toISOString()
  };
}

function saveArtifact(store: LocalWorkflowStore, artifacts: WorkflowArtifact[], item: WorkflowArtifact): void {
  artifacts.push(item);
  store.saveArtifact(item);
  store.appendEvent(event(item.runId, "artifact.created", { kind: item.kind }, item.producedBy.stepId, item.artifactId));
}

function createContextArtifact(runId: string, projectRoot: string): WorkflowArtifact {
  const report = buildOnboardingReport(projectRoot);
  return artifact(runId, "context-packet", "load-project", report.contextPacket as unknown as Record<string, unknown>, [
    { label: "projectRoot", uri: resolve(projectRoot) }
  ]);
}

function createDeliverySummaryArtifact(
  runId: string,
  artifactIds: string[],
  status: DeliverySummary["status"],
  reviewDecision: DeliverySummary["reviewDecision"],
  summaryText?: string
): WorkflowArtifact {
  const summary: DeliverySummary = {
    schemaVersion: "1.0.0",
    kind: "delivery-summary",
    runId,
    status,
    artifacts: artifactIds,
    summary:
      summaryText ??
      (status === "waiting-review" ? "Generic review completed and is waiting for manual decision." : "Generic review finished."),
    reviewDecision
  };

  return artifact(runId, "delivery-summary", "review-gate", summary as unknown as Record<string, unknown>);
}

function assertPhase2ReadOnly(workflow: WorkflowDefinition): void {
  if (workflow.runtimePolicy.workspaceWrite !== "disallowed") {
    throw new Error("Phase 2 workflow must disallow workspace writes.");
  }
  const writeStep = workflow.steps.find((step) => step.readOnly !== true);
  if (writeStep !== undefined) {
    throw new Error(`Phase 2 workflow step must be read-only: ${writeStep.id}`);
  }
}

function startStep(store: LocalWorkflowStore, runId: string, steps: WorkflowStepState[], stepId: string): void {
  const index = steps.findIndex((step) => step.stepId === stepId);
  steps[index] = transitionStep(steps[index], "running");
  store.saveStep(runId, steps[index]);
  store.appendEvent(event(runId, "step.started", {}, stepId));
}

function completeStep(store: LocalWorkflowStore, runId: string, steps: WorkflowStepState[], stepId: string): void {
  const index = steps.findIndex((step) => step.stepId === stepId);
  steps[index] = transitionStep(steps[index], "completed");
  store.saveStep(runId, steps[index]);
  store.appendEvent(event(runId, "step.completed", {}, stepId));
}

async function runReviewWorkflow(options: RunWorkflowOptions, workflow: WorkflowDefinition): Promise<RunWorkflowResult> {
  assertPhase2ReadOnly(workflow);

  const runId = options.runId ?? nextRunId();
  const provider = options.provider ?? createMockRuntimeProvider();
  const store = createLocalWorkflowStore(options.outputRoot);
  const projectRoot = resolve(options.projectRoot);
  let run: WorkflowRunState = { runId, workflowId: workflow.id, status: "pending" };
  const steps: WorkflowStepState[] = workflow.steps.map((step) => ({ stepId: step.id, status: "pending" }));
  const artifacts: WorkflowArtifact[] = [];

  run = transitionRun(run, "running");
  store.saveRun(run);
  store.appendEvent(event(runId, "run.started", { workflowId: workflow.id }));

  const session = await provider.createSession({ runId, workflowId: workflow.id, projectRoot });

  for (const stepDefinition of workflow.steps) {
    startStep(store, runId, steps, stepDefinition.id);

    if (stepDefinition.kind === "system") {
      saveArtifact(store, artifacts, createContextArtifact(runId, projectRoot));
      completeStep(store, runId, steps, stepDefinition.id);
    } else if (stepDefinition.kind === "agent") {
      const result = await provider.runStep(session, {
        runId,
        projectRoot,
        workflowId: workflow.id,
        step: stepDefinition,
        artifacts
      });
      for (const item of result.artifacts) {
        saveArtifact(store, artifacts, item);
      }
      completeStep(store, runId, steps, stepDefinition.id);
    } else {
      const reviewDecision = { runId, status: "pending" as const };
      const deliverySummary = createDeliverySummaryArtifact(
        runId,
        artifacts.map((item) => item.artifactId),
        "waiting-review",
        { status: "pending" }
      );
      saveArtifact(store, artifacts, deliverySummary);
      store.saveReviewDecision(reviewDecision);
      store.appendEvent(event(runId, "review.requested", {}, stepDefinition.id, deliverySummary.artifactId));
      const stepIndex = steps.findIndex((step) => step.stepId === stepDefinition.id);
      steps[stepIndex] = transitionStep(steps[stepIndex], "waiting-review");
      store.saveStep(runId, steps[stepIndex]);
      run = transitionRun(run, "waiting-review");
      store.saveRun(run);
    }
  }

  await provider.close?.(session);

  return {
    run,
    steps,
    artifacts,
    reviewDecision: {
      status: "pending"
    },
    store
  };
}

function chooseTargetFile(workdirRoot: string, requested?: string): string {
  if (requested !== undefined) return requested;
  for (const candidate of ["src/message.ts", "fixtures/modern-target/status-card.ts", "README.md"]) {
    if (existsSync(resolveInside(workdirRoot, candidate))) return candidate;
  }
  throw new Error("No default patch target found; provide --target-file.");
}

function bugFixContent(path: string, original: string, brief: string): string {
  const fixed = original.replaceAll("Needs fix", "Fixed").replaceAll("needs fix", "fixed");
  if (fixed !== original) return fixed;

  const safeBrief = brief.replace(/\s+/g, " ").trim();
  if (extname(path) === ".md") {
    return `${original.trimEnd()}\n\nForgeWeave bug-fix note: ${safeBrief}\n`;
  }
  return `${original.trimEnd()}\n// ForgeWeave bug-fix: ${safeBrief}\n`;
}

function createBugBrief(runId: string, brief: string, targetFile: string): WorkflowArtifact {
  const payload: BugBrief = {
    schemaVersion: "1.0.0",
    kind: "bug-brief",
    title: brief,
    description: brief,
    targetFiles: [targetFile],
    acceptanceCriteria: ["Patch is captured as a reviewable diff.", "Manifest-approved validation commands are summarized."]
  };
  return artifact(runId, "bug-brief", "plan-patch", payload as unknown as Record<string, unknown>);
}

function createPatchPlan(runId: string, brief: string, targetFile: string): WorkflowArtifact {
  const payload: PatchPlan = {
    schemaVersion: "1.0.0",
    kind: "patch-plan",
    goal: brief,
    targetFiles: [targetFile],
    steps: ["Prepare controlled workdir", "Apply one-file patch", "Capture diff", "Run manifest-approved validation"],
    risks: ["Fixture workflow uses deterministic patch behavior."]
  };
  return artifact(runId, "patch-plan", "plan-patch", payload as unknown as Record<string, unknown>);
}

function createWorkdirArtifact(runId: string, workdir: ControlledWorkdir): WorkflowArtifact {
  return artifact(runId, "workdir-provenance", "prepare-workdir", {
    runId: workdir.runId,
    sourceRoot: workdir.sourceRoot,
    workdirRoot: workdir.workdirRoot,
    validationMode: workdir.validationMode,
    createdAt: workdir.createdAt,
    provenance: workdir.provenance,
    warnings: workdir.warnings,
    filePolicy: workdir.filePolicy
  });
}

function createPatchReviewFindings(runId: string, targetFile: string): WorkflowArtifact {
  const payload: ReviewFindings = {
    schemaVersion: "1.0.0",
    kind: "review-findings",
    summary: `Mock patch review completed for ${targetFile}.`,
    findings: [
      {
        id: "FW-P3-R-001",
        severity: "info",
        title: "Patch captured for review",
        detail: "The mock workflow produced a controlled file-change-set and command-summary before review."
      }
    ],
    risks: ["Fixture patch does not represent live ACC source."],
    nextActions: ["Approve or reject the manual patch review gate."]
  };
  return artifact(runId, "review-findings", "validate", payload as unknown as Record<string, unknown>);
}

async function runGenericBugFixWorkflow(options: RunWorkflowOptions, workflow: WorkflowDefinition): Promise<RunWorkflowResult> {
  const runId = options.runId ?? nextRunId();
  const store = createLocalWorkflowStore(options.outputRoot);
  const projectRoot = resolve(options.projectRoot);
  let run: WorkflowRunState = { runId, workflowId: workflow.id, status: "pending" };
  const steps: WorkflowStepState[] = workflow.steps.map((step) => ({ stepId: step.id, status: "pending" }));
  const artifacts: WorkflowArtifact[] = [];
  const manifest = loadOrGenerateProjectManifest(projectRoot).manifest;
  const brief = options.brief ?? "Apply a small deterministic bug fix.";

  run = transitionRun(run, "running");
  store.saveRun(run);
  store.appendEvent(event(runId, "run.started", { workflowId: workflow.id }));

  startStep(store, runId, steps, "load-project");
  saveArtifact(store, artifacts, createContextArtifact(runId, projectRoot));
  completeStep(store, runId, steps, "load-project");

  startStep(store, runId, steps, "prepare-workdir");
  const workdir = createControlledWorkdir({
    projectRoot,
    outputRoot: options.outputRoot,
    runId,
    validationMode: manifest.validation.mode,
    filePolicy: defaultFilePolicy
  });
  saveArtifact(store, artifacts, createWorkdirArtifact(runId, workdir));
  completeStep(store, runId, steps, "prepare-workdir");

  const targetFile = chooseTargetFile(workdir.workdirRoot, options.targetFile);
  const filePolicy = evaluateFilePolicy(workdir.filePolicy, [{ path: targetFile, operation: "modify" }]);
  if (!filePolicy.allowed) {
    throw new Error(`Patch target rejected by file policy: ${filePolicy.rejections.join("; ")}`);
  }

  startStep(store, runId, steps, "plan-patch");
  saveArtifact(store, artifacts, createBugBrief(runId, brief, targetFile));
  saveArtifact(store, artifacts, createPatchPlan(runId, brief, targetFile));
  completeStep(store, runId, steps, "plan-patch");

  startStep(store, runId, steps, "apply-patch");
  const before = snapshotFiles(workdir.workdirRoot, [targetFile]);
  const targetPath = resolveInside(workdir.workdirRoot, targetFile);
  const original = readFileSync(targetPath, "utf8");
  writeFileSync(targetPath, bugFixContent(targetFile, original, brief));
  const after = snapshotFiles(workdir.workdirRoot, [targetFile]);
  const changeSet = captureFileChangeSet({
    rootDir: workdir.workdirRoot,
    before,
    after,
    rationale: brief,
    risk: "Low; one-file fixture patch inside allowlist."
  });
  saveArtifact(store, artifacts, artifact(runId, "file-change-set", "apply-patch", changeSet as unknown as Record<string, unknown>));
  completeStep(store, runId, steps, "apply-patch");

  startStep(store, runId, steps, "validate");
  const commandSummary = runValidationCommandSummary({
    manifest,
    cwd: workdir.workdirRoot,
    commands: options.validationCommands
  });
  saveArtifact(store, artifacts, artifact(runId, "command-summary", "validate", commandSummary as unknown as Record<string, unknown>));
  saveArtifact(store, artifacts, createPatchReviewFindings(runId, targetFile));
  completeStep(store, runId, steps, "validate");

  startStep(store, runId, steps, "review-gate");
  const reviewDecision = { runId, status: "pending" as const };
  const deliverySummary = createDeliverySummaryArtifact(
    runId,
    artifacts.map((item) => item.artifactId),
    "waiting-review",
    { status: "pending" },
    "Generic bug-fix patch is waiting for manual review."
  );
  saveArtifact(store, artifacts, deliverySummary);
  store.saveReviewDecision(reviewDecision);
  store.appendEvent(event(runId, "review.requested", {}, "review-gate", deliverySummary.artifactId));
  const reviewStepIndex = steps.findIndex((step) => step.stepId === "review-gate");
  steps[reviewStepIndex] = transitionStep(steps[reviewStepIndex], "waiting-review");
  store.saveStep(runId, steps[reviewStepIndex]);
  run = transitionRun(run, "waiting-review");
  store.saveRun(run);

  return {
    run,
    steps,
    artifacts,
    reviewDecision: {
      status: "pending"
    },
    store
  };
}

export async function runWorkflow(options: RunWorkflowOptions): Promise<RunWorkflowResult> {
  const workflow = options.workflow ?? genericReviewWorkflow;

  if (workflow.id === genericBugFixWorkflow.id) {
    return runGenericBugFixWorkflow(options, workflow);
  }

  return runReviewWorkflow(options, workflow);
}
