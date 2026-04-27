import type { DeliverySummary, WorkflowArtifact, WorkflowEventEnvelope } from "@forgeweave/contracts";

import { createLocalWorkflowStore, type LocalWorkflowStore, type ReviewDecisionRecord } from "./local-store.js";
import { transitionRun, transitionStep } from "./state-machine.js";

export type ReviewDecisionInput = {
  outputRoot: string;
  runId: string;
  decision: "approve" | "reject";
  reason?: string;
};

export type ReviewDecisionResult = {
  decision: ReviewDecisionRecord;
  runStatus: "completed" | "rejected";
};

function event(runId: string, type: WorkflowEventEnvelope["type"], payload: Record<string, unknown>): WorkflowEventEnvelope {
  return {
    schemaVersion: "1.0.0",
    kind: "workflow-event",
    eventId: `${runId}-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    type,
    timestamp: new Date().toISOString(),
    payload
  };
}

function deliverySummaryArtifact(store: LocalWorkflowStore, runId: string): WorkflowArtifact | undefined {
  return store.listArtifacts(runId).find((artifact) => artifact.kind === "delivery-summary");
}

function updateDeliverySummary(
  artifact: WorkflowArtifact,
  status: DeliverySummary["status"],
  reviewDecision: DeliverySummary["reviewDecision"]
): WorkflowArtifact {
  const previous = artifact.payload as unknown as DeliverySummary;
  return {
    ...artifact,
    payload: {
      ...previous,
      status,
      reviewDecision,
      summary:
        status === "completed"
          ? "Generic review approved."
          : status === "rejected"
            ? "Generic review rejected."
            : previous.summary
    } as unknown as Record<string, unknown>
  };
}

export function recordReviewDecision(input: ReviewDecisionInput): ReviewDecisionResult {
  if (input.decision === "reject" && (input.reason === undefined || input.reason.trim().length === 0)) {
    throw new Error("Reject decision requires a non-empty reason.");
  }

  const store = createLocalWorkflowStore(input.outputRoot);
  const run = store.loadRun(input.runId);
  if (run.status !== "waiting-review") {
    throw new Error(`Run is not waiting for review: ${run.status}`);
  }

  const reviewGate = store.loadSteps(input.runId).find((step) => step.stepId === "review-gate");
  if (reviewGate === undefined || reviewGate.status !== "waiting-review") {
    throw new Error("Review gate step is not waiting for review.");
  }

  const decidedAt = new Date().toISOString();
  const decision: ReviewDecisionRecord =
    input.decision === "approve"
      ? { runId: input.runId, status: "approved", decidedAt }
      : { runId: input.runId, status: "rejected", reason: input.reason, decidedAt };
  const nextRunStatus = input.decision === "approve" ? "completed" : "rejected";
  const nextStepStatus = input.decision === "approve" ? "completed" : "failed";

  store.saveReviewDecision(decision);
  store.saveStep(input.runId, transitionStep(reviewGate, nextStepStatus));
  store.saveRun(transitionRun(run, nextRunStatus));
  store.appendEvent(event(input.runId, input.decision === "approve" ? "review.approved" : "review.rejected", decision));

  const summary = deliverySummaryArtifact(store, input.runId);
  if (summary !== undefined) {
    store.saveArtifact(
      updateDeliverySummary(summary, input.decision === "approve" ? "completed" : "rejected", {
        status: decision.status,
        reason: decision.reason
      })
    );
  }

  return {
    decision,
    runStatus: nextRunStatus
  };
}
