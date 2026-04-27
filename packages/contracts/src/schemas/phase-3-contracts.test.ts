import { describe, expect, it } from "vitest";

import {
  validateBugBrief,
  validateCommandSummary,
  validateFeatureSpec,
  validateFileChangeSet,
  validateImplementationPlan,
  validatePatchPlan,
  validateRequirementBrief
} from "./phase-3-contracts.js";
import { validateWorkflowDefinition } from "./workflow-definition.js";

describe("phase 3 contracts", () => {
  it("validates bug briefs and patch plans", () => {
    expect(
      validateBugBrief({
        schemaVersion: "1.0.0",
        kind: "bug-brief",
        title: "Fix stale label",
        description: "The fixture label is stale.",
        targetFiles: ["src/message.ts"],
        acceptanceCriteria: ["Label returns fixed text."]
      }).valid
    ).toBe(true);

    expect(
      validatePatchPlan({
        schemaVersion: "1.0.0",
        kind: "patch-plan",
        goal: "Patch one file",
        targetFiles: ["src/message.ts"],
        steps: ["Update fixture label", "Run validation"],
        risks: ["Fixture-only coverage"]
      }).valid
    ).toBe(true);
  });

  it("validates file-change-set and command-summary artifacts", () => {
    expect(
      validateFileChangeSet({
        schemaVersion: "1.0.0",
        kind: "file-change-set",
        changedFiles: [
          {
            path: "src/message.ts",
            operation: "modify",
            beforeHash: "abc",
            afterHash: "def",
            rationale: "Update stale label",
            risk: "Low",
            hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, summary: "Replace label" }]
          }
        ],
        unifiedDiff: "--- a/src/message.ts\n+++ b/src/message.ts"
      }).valid
    ).toBe(true);

    expect(
      validateCommandSummary({
        schemaVersion: "1.0.0",
        kind: "command-summary",
        overallStatus: "passed",
        commands: [{ name: "test", command: "npm test", status: "passed", exitCode: 0, durationMs: 12 }]
      }).valid
    ).toBe(true);
  });

  it("allows controlled workspace-write workflow definitions", () => {
    expect(
      validateWorkflowDefinition({
        schemaVersion: "1.0.0",
        kind: "workflow-definition",
        id: "generic.bug-fix",
        title: "Generic bug fix",
        version: "0.1.0",
        steps: [
          { id: "load-project", kind: "system", title: "Load project", readOnly: true },
          { id: "apply-patch", kind: "agent", title: "Apply patch", readOnly: false }
        ],
        reviewPolicy: { required: true, decisions: ["approve", "reject"] },
        runtimePolicy: { defaultProvider: "mock", workspaceWrite: "controlled" }
      }).valid
    ).toBe(true);
  });

  it("validates small new-feature contracts", () => {
    expect(
      validateRequirementBrief({
        schemaVersion: "1.0.0",
        kind: "requirement-brief",
        title: "Add fixture helper",
        description: "Add a small helper file.",
        targetFiles: ["src/feature-helper.ts"],
        acceptanceCriteria: ["Helper exports a label."],
        assumptions: ["Fixture-only implementation"]
      }).valid
    ).toBe(true);

    expect(
      validateFeatureSpec({
        schemaVersion: "1.0.0",
        kind: "feature-spec",
        scope: "small",
        summary: "Add helper",
        targetFiles: ["src/feature-helper.ts"],
        acceptanceCriteria: ["Helper exports a label."],
        assumptions: ["No runtime integration needed."],
        nonGoals: ["No multi-module refactor."]
      }).valid
    ).toBe(true);

    expect(
      validateImplementationPlan({
        schemaVersion: "1.0.0",
        kind: "implementation-plan",
        targetFiles: ["src/feature-helper.ts"],
        steps: ["Create helper", "Run validation"],
        validationCommands: ["lint", "test", "build"],
        risks: ["Fixture-only validation"]
      }).valid
    ).toBe(true);
  });
});
