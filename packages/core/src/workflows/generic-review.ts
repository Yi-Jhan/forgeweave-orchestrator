import type { WorkflowDefinition } from "@forgeweave/contracts";

export const genericReviewWorkflow: WorkflowDefinition = {
  schemaVersion: "1.0.0",
  kind: "workflow-definition",
  id: "generic.review",
  title: "Generic read-only review",
  version: "0.1.0",
  inputs: ["projectRoot"],
  outputs: ["context-packet", "review-findings", "delivery-summary"],
  steps: [
    {
      id: "load-project",
      kind: "system",
      title: "Load project context",
      outputs: ["context-packet"],
      readOnly: true
    },
    {
      id: "review",
      kind: "agent",
      title: "Run deterministic mock review",
      dependsOn: ["load-project"],
      inputs: ["context-packet"],
      outputs: ["review-findings"],
      runtime: "mock",
      readOnly: true
    },
    {
      id: "review-gate",
      kind: "human-review",
      title: "Manual review gate",
      dependsOn: ["review"],
      inputs: ["review-findings"],
      outputs: ["delivery-summary"],
      readOnly: true
    }
  ],
  reviewPolicy: {
    required: true,
    decisions: ["approve", "reject"]
  },
  runtimePolicy: {
    defaultProvider: "mock",
    workspaceWrite: "disallowed"
  }
};
