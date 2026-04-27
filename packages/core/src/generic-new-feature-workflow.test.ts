import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";
import { runWorkflow } from "./workflow-runner.js";
import { genericNewFeatureWorkflow } from "./workflows/generic-new-feature.js";

function writeManifest(projectRoot: string): void {
  writeFileSync(
    join(projectRoot, "forgeweave.manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "1.0.0",
        kind: "project-manifest",
        project: {
          id: "feature-fixture",
          name: "Feature Fixture",
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
          enabled: ["generic.new-feature"]
        },
        policies: {
          externalNetworkDefault: "blocked",
          humanReviewRequiredFor: ["feature"]
        }
      },
      null,
      2
    )}\n`
  );
}

describe("generic.new-feature workflow", () => {
  it("creates a controlled new file and modifies an allowlisted file", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "forgeweave-feature-source-"));
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-feature-output-"));
    mkdirSync(join(projectRoot, "src"));
    writeManifest(projectRoot);
    writeFileSync(join(projectRoot, "README.md"), "# Feature fixture\n");

    const result = await runWorkflow({
      workflow: genericNewFeatureWorkflow,
      projectRoot,
      outputRoot,
      runId: "feature-run",
      brief: "Add a tiny fixture helper.",
      targetFile: "src/feature-helper.ts"
    });
    const store = createLocalWorkflowStore(outputRoot);
    const workdirFile = join(outputRoot, "workdirs", "feature-run", "project", "src", "feature-helper.ts");
    const readmeFile = join(outputRoot, "workdirs", "feature-run", "project", "README.md");
    const changeSet = store.loadArtifact("feature-run", "feature-run-file-change-set");

    expect(result.run.status).toBe("waiting-review");
    expect(result.steps.map((step) => [step.stepId, step.status])).toEqual([
      ["load-project", "completed"],
      ["prepare-workdir", "completed"],
      ["spec-plan", "completed"],
      ["apply-patch", "completed"],
      ["validate", "completed"],
      ["review-gate", "waiting-review"]
    ]);
    expect(existsSync(workdirFile)).toBe(true);
    expect(readFileSync(workdirFile, "utf8")).toContain("forgeweaveFeatureNote");
    expect(readFileSync(readmeFile, "utf8")).toContain("ForgeWeave feature note");
    expect(store.listArtifacts("feature-run").map((artifact) => artifact.kind)).toEqual(
      expect.arrayContaining(["requirement-brief", "feature-spec", "implementation-plan", "file-change-set", "command-summary"])
    );
    expect(changeSet.payload.unifiedDiff).toContain("--- a/src/feature-helper.ts");
    expect(changeSet.payload.unifiedDiff).toContain("--- a/README.md");
  });

  it("rejects oversized feature requests before applying a patch", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "forgeweave-feature-source-"));
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-feature-output-"));
    mkdirSync(join(projectRoot, "src"));
    writeManifest(projectRoot);
    writeFileSync(join(projectRoot, "README.md"), "# Feature fixture\n");

    await expect(
      runWorkflow({
        workflow: genericNewFeatureWorkflow,
        projectRoot,
        outputRoot,
        runId: "feature-reject",
        brief: "Migrate and redesign multiple modules across the whole app.",
        targetFile: "src/feature-helper.ts"
      })
    ).rejects.toThrow("small-scope guard");
  });
});
