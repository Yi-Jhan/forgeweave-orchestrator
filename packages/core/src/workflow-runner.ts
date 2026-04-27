import { resolve } from "node:path";

import type { DeliverySummary, WorkflowArtifact, WorkflowDefinition, WorkflowEventEnvelope } from "@forgeweave/contracts";

import { buildOnboardingReport } from "./onboarding-report.js";
import { createLocalWorkflowStore, type LocalWorkflowStore } from "./local-store.js";
import { createMockRuntimeProvider } from "./mock-runtime-provider.js";
import type { AgentRuntimeProvider } from "./runtime-provider.js";
import { transitionRun, transitionStep, type WorkflowRunState, type WorkflowStepState } from "./state-machine.js";
import { genericReviewWorkflow } from "./workflows/generic-review.js";

export type RunWorkflowOptions = {
  projectRoot: string;
  outputRoot: string;
  runId?: string;
  workflow?: WorkflowDefinition;
  provider?: AgentRuntimeProvider;
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

function createContextArtifact(runId: string, projectRoot: string): WorkflowArtifact {
  const report = buildOnboardingReport(projectRoot);
  return {
    schemaVersion: "1.0.0",
    kind: "context-packet",
    artifactId: `${runId}-context-packet`,
    runId,
    status: "ready",
    producedBy: {
      stepId: "load-project"
    },
    refs: [{ label: "projectRoot", uri: resolve(projectRoot) }],
    payload: report.contextPacket as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString()
  };
}

function createDeliverySummaryArtifact(
  runId: string,
  artifactIds: string[],
  status: DeliverySummary["status"],
  reviewDecision: DeliverySummary["reviewDecision"]
): WorkflowArtifact {
  const summary: DeliverySummary = {
    schemaVersion: "1.0.0",
    kind: "delivery-summary",
    runId,
    status,
    artifacts: artifactIds,
    summary: status === "waiting-review" ? "Generic review completed and is waiting for manual decision." : "Generic review finished.",
    reviewDecision
  };

  return {
    schemaVersion: "1.0.0",
    kind: "delivery-summary",
    artifactId: `${runId}-delivery-summary`,
    runId,
    status: "ready",
    producedBy: {
      stepId: "review-gate"
    },
    refs: [],
    payload: summary as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString()
  };
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

export async function runWorkflow(options: RunWorkflowOptions): Promise<RunWorkflowResult> {
  const workflow = options.workflow ?? genericReviewWorkflow;
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
    const stepIndex = steps.findIndex((step) => step.stepId === stepDefinition.id);
    steps[stepIndex] = transitionStep(steps[stepIndex], "running");
    store.saveStep(runId, steps[stepIndex]);
    store.appendEvent(event(runId, "step.started", {}, stepDefinition.id));

    if (stepDefinition.kind === "system") {
      const artifact = createContextArtifact(runId, projectRoot);
      artifacts.push(artifact);
      store.saveArtifact(artifact);
      store.appendEvent(event(runId, "artifact.created", { kind: artifact.kind }, stepDefinition.id, artifact.artifactId));
      steps[stepIndex] = transitionStep(steps[stepIndex], "completed");
    } else if (stepDefinition.kind === "agent") {
      const result = await provider.runStep(session, {
        runId,
        projectRoot,
        workflowId: workflow.id,
        step: stepDefinition,
        artifacts
      });
      for (const artifact of result.artifacts) {
        artifacts.push(artifact);
        store.saveArtifact(artifact);
        store.appendEvent(event(runId, "artifact.created", { kind: artifact.kind }, stepDefinition.id, artifact.artifactId));
      }
      steps[stepIndex] = transitionStep(steps[stepIndex], "completed");
    } else {
      const reviewDecision = { runId, status: "pending" as const };
      const deliverySummary = createDeliverySummaryArtifact(
        runId,
        artifacts.map((artifact) => artifact.artifactId),
        "waiting-review",
        { status: "pending" }
      );
      artifacts.push(deliverySummary);
      store.saveArtifact(deliverySummary);
      store.saveReviewDecision(reviewDecision);
      store.appendEvent(event(runId, "review.requested", {}, stepDefinition.id, deliverySummary.artifactId));
      steps[stepIndex] = transitionStep(steps[stepIndex], "waiting-review");
      run = transitionRun(run, "waiting-review");
      store.saveRun(run);
    }

    store.saveStep(runId, steps[stepIndex]);
    if (steps[stepIndex].status === "completed") {
      store.appendEvent(event(runId, "step.completed", {}, stepDefinition.id));
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
