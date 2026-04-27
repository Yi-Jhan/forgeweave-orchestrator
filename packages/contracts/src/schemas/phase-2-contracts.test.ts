import { describe, expect, it } from "vitest";

import { validateDeliverySummary, validateReviewFindings } from "./review-artifacts.js";
import { validateWorkflowArtifact } from "./workflow-artifact.js";
import { validateWorkflowDefinition } from "./workflow-definition.js";
import { validateWorkflowEventEnvelope } from "./workflow-event.js";

describe("phase 2 contracts", () => {
  it("validates workflow definitions", () => {
    expect(
      validateWorkflowDefinition({
        schemaVersion: "1.0.0",
        kind: "workflow-definition",
        id: "generic.review",
        title: "Generic Review",
        version: "0.1.0",
        inputs: ["projectRoot"],
        outputs: ["review-findings", "delivery-summary"],
        steps: [
          { id: "load-project", kind: "system", title: "Load project", outputs: ["context-packet"], readOnly: true },
          {
            id: "review",
            kind: "agent",
            title: "Review project",
            dependsOn: ["load-project"],
            inputs: ["context-packet"],
            outputs: ["review-findings"],
            runtime: "mock",
            readOnly: true
          },
          {
            id: "review-gate",
            kind: "human-review",
            title: "Review gate",
            dependsOn: ["review"],
            inputs: ["review-findings"],
            readOnly: true
          }
        ],
        reviewPolicy: { required: true, decisions: ["approve", "reject"] },
        runtimePolicy: { defaultProvider: "mock", workspaceWrite: "disallowed" }
      }).valid
    ).toBe(true);

    expect(
      validateWorkflowDefinition({
        schemaVersion: "1.0.0",
        kind: "workflow-definition",
        id: "bad",
        title: "Bad",
        version: "0.1.0",
        steps: [{ id: "write", kind: "agent", title: "Write", readOnly: false }],
        reviewPolicy: { required: true, decisions: ["approve"] },
        runtimePolicy: { defaultProvider: "mock", workspaceWrite: "allowed" }
      }).valid
    ).toBe(false);
  });

  it("validates workflow artifacts and events", () => {
    expect(
      validateWorkflowArtifact({
        schemaVersion: "1.0.0",
        kind: "review-findings",
        artifactId: "artifact-1",
        runId: "run-1",
        status: "ready",
        producedBy: { stepId: "review", provider: "mock" },
        refs: [{ label: "project", uri: "file://fixture" }],
        payload: { summary: "ok" },
        createdAt: "2026-04-27T00:00:00.000Z"
      }).valid
    ).toBe(true);

    expect(
      validateWorkflowEventEnvelope({
        schemaVersion: "1.0.0",
        kind: "workflow-event",
        eventId: "event-1",
        runId: "run-1",
        stepId: "review",
        artifactId: "artifact-1",
        type: "artifact.created",
        timestamp: "2026-04-27T00:00:00.000Z",
        payload: {}
      }).valid
    ).toBe(true);
  });

  it("validates review findings and delivery summaries", () => {
    expect(
      validateReviewFindings({
        schemaVersion: "1.0.0",
        kind: "review-findings",
        summary: "Read-only review completed.",
        findings: [{ id: "FW-R-001", severity: "info", title: "No write operations", detail: "Fixture was inspected only." }],
        risks: ["Fixture scope is synthetic."],
        nextActions: ["Approve or reject the review gate."]
      }).valid
    ).toBe(true);

    expect(
      validateDeliverySummary({
        schemaVersion: "1.0.0",
        kind: "delivery-summary",
        runId: "run-1",
        status: "waiting-review",
        artifacts: ["artifact-1"],
        summary: "Waiting for manual review.",
        reviewDecision: { status: "pending" }
      }).valid
    ).toBe(true);
  });
});
