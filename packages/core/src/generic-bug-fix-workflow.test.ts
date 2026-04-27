import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";
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
          id: "bug-fix-fixture",
          name: "Bug Fix Fixture",
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

describe("generic.bug-fix workflow", () => {
  it("runs a controlled patch-first bug fix without modifying source fixture files", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "forgeweave-bug-source-"));
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-bug-output-"));
    mkdirSync(join(projectRoot, "src"));
    writeManifest(projectRoot);
    writeFileSync(join(projectRoot, "src", "message.ts"), "export const message = 'Needs fix';\n");

    const result = await runWorkflow({
      workflow: genericBugFixWorkflow,
      projectRoot,
      outputRoot,
      runId: "bug-run",
      brief: "Fix stale fixture message.",
      targetFile: "src/message.ts"
    });
    const store = createLocalWorkflowStore(outputRoot);
    const workdirFile = join(outputRoot, "workdirs", "bug-run", "project", "src", "message.ts");
    const artifactKinds = store.listArtifacts("bug-run").map((artifact) => artifact.kind);

    expect(result.run.status).toBe("waiting-review");
    expect(result.steps.map((step) => [step.stepId, step.status])).toEqual([
      ["load-project", "completed"],
      ["prepare-workdir", "completed"],
      ["plan-patch", "completed"],
      ["apply-patch", "completed"],
      ["validate", "completed"],
      ["review-gate", "waiting-review"]
    ]);
    expect(readFileSync(join(projectRoot, "src", "message.ts"), "utf8")).toContain("Needs fix");
    expect(readFileSync(workdirFile, "utf8")).toContain("Fixed");
    expect(artifactKinds).toEqual(
      expect.arrayContaining([
        "context-packet",
        "workdir-provenance",
        "bug-brief",
        "patch-plan",
        "file-change-set",
        "command-summary",
        "review-findings",
        "delivery-summary"
      ])
    );
    expect(store.loadArtifact("bug-run", "bug-run-file-change-set").payload.unifiedDiff).toContain("+export const message");
    expect(store.loadArtifact("bug-run", "bug-run-command-summary").payload.overallStatus).toBe("skipped");
    expect(store.loadReviewDecision("bug-run").status).toBe("pending");
    expect(existsSync(join(projectRoot, ".forgeweave"))).toBe(false);
  });
});
