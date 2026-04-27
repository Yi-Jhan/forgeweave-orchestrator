import type { CommandSummary, WorkflowArtifact, WorkflowEventEnvelope } from "@forgeweave/contracts";

import { runValidationCommandSummary } from "./command-runner.js";
import { createLocalWorkflowStore, type ReviewDecisionRecord } from "./local-store.js";
import { loadOrGenerateProjectManifest } from "./manifest.js";
import type { WorkflowStepState } from "./state-machine.js";

export type RerunRejectedStepOptions = {
  outputRoot: string;
  runId: string;
  stepId?: string;
};

export type RerunRejectedStepResult = {
  runId: string;
  stepId: string;
  rejectReason: string;
  artifacts: WorkflowArtifact[];
};

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

function requireRejectedDecision(decision: ReviewDecisionRecord): string {
  if (decision.status !== "rejected" || decision.reason === undefined || decision.reason.trim().length === 0) {
    throw new Error("Run must have a rejected review decision with a reason before rerun.");
  }
  return decision.reason;
}

export function suggestRerunStep(reason: string): string {
  const normalized = reason.toLowerCase();
  if (/(lint|test|build|validation|command)/.test(normalized)) return "validate";
  return "apply-patch";
}

function workdirArtifactPayload(artifact: WorkflowArtifact): { sourceRoot: string; workdirRoot: string } {
  const payload = artifact.payload as Record<string, unknown>;
  if (typeof payload.sourceRoot !== "string" || typeof payload.workdirRoot !== "string") {
    throw new Error("workdir-provenance artifact is missing sourceRoot or workdirRoot.");
  }
  return {
    sourceRoot: payload.sourceRoot,
    workdirRoot: payload.workdirRoot
  };
}

function workflowArtifact(
  runId: string,
  artifactId: string,
  kind: string,
  stepId: string,
  payload: Record<string, unknown>
): WorkflowArtifact {
  return {
    schemaVersion: "1.0.0",
    kind,
    artifactId,
    runId,
    status: "ready",
    producedBy: {
      stepId
    },
    refs: [],
    payload,
    createdAt: new Date().toISOString()
  };
}

export function rerunRejectedStep(options: RerunRejectedStepOptions): RerunRejectedStepResult {
  const store = createLocalWorkflowStore(options.outputRoot);
  const run = store.loadRun(options.runId);
  if (run.status !== "rejected") {
    throw new Error(`Run is not rejected: ${run.status}`);
  }

  const rejectReason = requireRejectedDecision(store.loadReviewDecision(options.runId));
  const stepId = options.stepId ?? suggestRerunStep(rejectReason);
  if (stepId !== "validate") {
    throw new Error(`Phase 3 rerun currently supports validate step only: ${stepId}`);
  }

  const workdir = store.listArtifacts(options.runId).find((artifact) => artifact.kind === "workdir-provenance");
  if (workdir === undefined) {
    throw new Error("Cannot rerun validation without workdir-provenance artifact.");
  }

  const { sourceRoot, workdirRoot } = workdirArtifactPayload(workdir);
  const manifest = loadOrGenerateProjectManifest(sourceRoot).manifest;
  const commandSummary: CommandSummary = runValidationCommandSummary({ manifest, cwd: workdirRoot });
  const rerunStepId = `${stepId}#rerun`;
  const commandSummaryArtifact = workflowArtifact(
    options.runId,
    `${options.runId}-${rerunStepId}-command-summary`,
    "command-summary",
    rerunStepId,
    commandSummary as unknown as Record<string, unknown>
  );
  const rerunSummaryArtifact = workflowArtifact(options.runId, `${options.runId}-${rerunStepId}-summary`, "rerun-summary", rerunStepId, {
    runId: options.runId,
    stepId,
    rejectReason,
    producedArtifacts: [commandSummaryArtifact.artifactId],
    summary: "Rejected review reason was propagated into a targeted validation rerun."
  });
  const rerunStep: WorkflowStepState = {
    stepId: rerunStepId,
    status: "completed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  };

  store.saveStep(options.runId, rerunStep);
  store.appendEvent(event(options.runId, "step.started", { rejectReason, rerunOf: stepId }, rerunStepId));
  store.saveArtifact(commandSummaryArtifact);
  store.appendEvent(
    event(options.runId, "artifact.created", { kind: commandSummaryArtifact.kind }, rerunStepId, commandSummaryArtifact.artifactId)
  );
  store.saveArtifact(rerunSummaryArtifact);
  store.appendEvent(event(options.runId, "artifact.created", { kind: rerunSummaryArtifact.kind }, rerunStepId, rerunSummaryArtifact.artifactId));
  store.appendEvent(event(options.runId, "step.completed", { rerunOf: stepId }, rerunStepId));

  return {
    runId: options.runId,
    stepId,
    rejectReason,
    artifacts: [commandSummaryArtifact, rerunSummaryArtifact]
  };
}
