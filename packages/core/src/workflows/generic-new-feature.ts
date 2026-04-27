import type { WorkflowDefinition } from "@forgeweave/contracts";

export const genericNewFeatureWorkflow: WorkflowDefinition = {
  schemaVersion: "1.0.0",
  kind: "workflow-definition",
  id: "generic.new-feature",
  title: "Generic small new-feature delivery",
  version: "0.1.0",
  inputs: ["projectRoot", "requirementBrief"],
  outputs: [
    "requirement-brief",
    "feature-spec",
    "implementation-plan",
    "file-change-set",
    "command-summary",
    "review-findings",
    "delivery-summary"
  ],
  steps: [
    {
      id: "load-project",
      kind: "system",
      title: "Load project context",
      outputs: ["context-packet"],
      readOnly: true
    },
    {
      id: "prepare-workdir",
      kind: "system",
      title: "Prepare controlled workdir",
      dependsOn: ["load-project"],
      outputs: ["workdir-provenance"],
      readOnly: true
    },
    {
      id: "spec-plan",
      kind: "agent",
      title: "Create small feature spec and plan",
      dependsOn: ["prepare-workdir"],
      inputs: ["requirement-brief", "context-packet"],
      outputs: ["feature-spec", "implementation-plan"],
      runtime: "mock",
      readOnly: true
    },
    {
      id: "apply-patch",
      kind: "agent",
      title: "Apply controlled feature patch",
      dependsOn: ["spec-plan"],
      inputs: ["implementation-plan"],
      outputs: ["file-change-set"],
      runtime: "mock",
      readOnly: false
    },
    {
      id: "validate",
      kind: "system",
      title: "Run manifest-approved validation commands",
      dependsOn: ["apply-patch"],
      inputs: ["file-change-set"],
      outputs: ["command-summary"],
      readOnly: true
    },
    {
      id: "review-gate",
      kind: "human-review",
      title: "Manual feature review gate",
      dependsOn: ["validate"],
      inputs: ["file-change-set", "command-summary", "review-findings"],
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
    workspaceWrite: "controlled"
  }
};
