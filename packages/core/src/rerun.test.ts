import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";
import { recordReviewDecision } from "./review-decision.js";
import { rerunRejectedStep, suggestRerunStep } from "./rerun.js";
import { runWorkflow } from "./workflow-runner.js";
import { genericBugFixWorkflow } from "./workflows/generic-bug-fix.js";

function writeManifest(projectRoot: string): void {
  writeFileSync(
    join(projectRoot, "forgeweave.manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "1.0.0",
        kind: "project-manifest",
        project: {
          id: "rerun-fixture",
          name: "Rerun Fixture",
          type: "node-typescript-fixture",
          framework: "none",
          language: "typescript"
        },
        validation: {
          mode: "fixture",
          realProjectRootEnv: "FORGEWEAVE_SECOND_PROJECT_ROOT"
        },
        commands: {
          lint: "npm run lint",
          test: "npm run test",
          build: "npm run build"
        },
        workflows: {
          enabled: ["generic.bug-fix"]
        },
        policies: {
          externalNetworkDefault: "blocked",
          humanReviewRequiredFor: ["bug-fix"]
        }
      },
      null,
      2
    )}\n`
  );
}

describe("reject reason rerun", () => {
  it("suggests validation for command-related reject reasons", () => {
    expect(suggestRerunStep("Please rerun tests")).toBe("validate");
    expect(suggestRerunStep("Patch needs clearer copy")).toBe("apply-patch");
  });

  it("reruns validation without rerunning the whole workflow", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "forgeweave-rerun-source-"));
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-rerun-output-"));
    mkdirSync(join(projectRoot, "src"));
    writeManifest(projectRoot);
    writeFileSync(join(projectRoot, "src", "message.ts"), "export const message = 'Needs fix';\n");

    await runWorkflow({
      workflow: genericBugFixWorkflow,
      projectRoot,
      outputRoot,
      runId: "rerun-run",
      brief: "Fix rerun message.",
      targetFile: "src/message.ts"
    });
    recordReviewDecision({
      outputRoot,
      runId: "rerun-run",
      decision: "reject",
      reason: "Please rerun validation commands."
    });

    const result = rerunRejectedStep({ outputRoot, runId: "rerun-run" });
    const store = createLocalWorkflowStore(outputRoot);

    expect(result.stepId).toBe("validate");
    expect(result.rejectReason).toBe("Please rerun validation commands.");
    expect(store.loadRun("rerun-run").status).toBe("rejected");
    expect(store.loadSteps("rerun-run").map((step) => step.stepId)).toContain("validate#rerun");
    expect(store.listArtifacts("rerun-run").map((artifact) => artifact.kind)).toContain("rerun-summary");
  });
});
