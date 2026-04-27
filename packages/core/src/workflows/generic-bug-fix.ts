import type { WorkflowDefinition } from "@forgeweave/contracts";

export const genericBugFixWorkflow: WorkflowDefinition = {
  schemaVersion: "1.0.0",
  kind: "workflow-definition",
  id: "generic.bug-fix",
  title: "Generic patch-first bug fix",
  version: "0.1.0",
  inputs: ["projectRoot", "bugBrief"],
  outputs: ["bug-brief", "patch-plan", "file-change-set", "command-summary", "review-findings", "delivery-summary"],
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
      id: "plan-patch",
      kind: "agent",
      title: "Plan small bug-fix patch",
      dependsOn: ["prepare-workdir"],
      inputs: ["bug-brief", "context-packet"],
      outputs: ["patch-plan"],
      runtime: "mock",
      readOnly: true
    },
    {
      id: "apply-patch",
      kind: "agent",
      title: "Apply controlled patch",
      dependsOn: ["plan-patch"],
      inputs: ["patch-plan"],
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
      title: "Manual patch review gate",
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
