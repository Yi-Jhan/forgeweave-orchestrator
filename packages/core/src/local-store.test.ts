import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";

describe("local workflow store", () => {
  it("persists run, step, artifact, event, and review decision records", () => {
    const store = createLocalWorkflowStore(mkdtempSync(join(tmpdir(), "forgeweave-store-")));

    store.saveRun({ runId: "run-1", workflowId: "generic.review", status: "running", startedAt: "t1" });
    store.saveStep("run-1", { stepId: "load-project", status: "completed", startedAt: "t1", finishedAt: "t2" });
    store.saveArtifact({
      schemaVersion: "1.0.0",
      kind: "review-findings",
      artifactId: "artifact-1",
      runId: "run-1",
      status: "ready",
      producedBy: { stepId: "review", provider: "mock" },
      refs: [],
      payload: { summary: "ok" },
      createdAt: "t2"
    });
    store.appendEvent({
      schemaVersion: "1.0.0",
      kind: "workflow-event",
      eventId: "event-1",
      runId: "run-1",
      stepId: "review",
      artifactId: "artifact-1",
      type: "artifact.created",
      timestamp: "t2",
      payload: {}
    });
    store.saveReviewDecision({ runId: "run-1", status: "rejected", reason: "Needs another review pass.", decidedAt: "t3" });

    expect(store.loadRun("run-1").workflowId).toBe("generic.review");
    expect(store.loadSteps("run-1")).toHaveLength(1);
    expect(store.loadArtifact("run-1", "artifact-1").producedBy.stepId).toBe("review");
    expect(store.listArtifacts("run-1").map((artifact) => artifact.artifactId)).toEqual(["artifact-1"]);
    expect(store.loadEvents("run-1").map((event) => event.type)).toEqual(["artifact.created"]);
    expect(store.loadReviewDecision("run-1")).toEqual({
      runId: "run-1",
      status: "rejected",
      reason: "Needs another review pass.",
      decidedAt: "t3"
    });
  });
});
