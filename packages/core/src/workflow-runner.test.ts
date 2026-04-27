import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";
import { runWorkflow } from "./workflow-runner.js";
import { genericReviewWorkflow } from "./workflows/generic-review.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const accFixtureRoot = resolve(repoRoot, "examples/acc");
const minimalFixtureRoot = resolve(repoRoot, "examples/minimal-project");

describe("generic.review workflow runner", () => {
  it("runs the ACC fixture to the manual review gate", async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-review-"));
    const result = await runWorkflow({ projectRoot: accFixtureRoot, outputRoot, runId: "run-acc" });
    const store = createLocalWorkflowStore(outputRoot);

    expect(result.run.status).toBe("waiting-review");
    expect(result.steps.map((step) => [step.stepId, step.status])).toEqual([
      ["load-project", "completed"],
      ["review", "completed"],
      ["review-gate", "waiting-review"]
    ]);
    expect(store.listArtifacts("run-acc").map((artifact) => artifact.kind).sort()).toEqual([
      "context-packet",
      "delivery-summary",
      "review-findings"
    ]);
    expect(store.loadReviewDecision("run-acc").status).toBe("pending");
    expect(store.loadEvents("run-acc").map((item) => item.type)).toContain("review.requested");
    expect(existsSync(resolve(accFixtureRoot, ".forgeweave"))).toBe(false);
  });

  it("runs the minimal fixture without ACC-specific logic", async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-review-"));
    const result = await runWorkflow({ projectRoot: minimalFixtureRoot, outputRoot, runId: "run-minimal" });

    const reviewArtifact = result.artifacts.find((artifact) => artifact.kind === "review-findings");
    expect(result.run.status).toBe("waiting-review");
    expect(reviewArtifact?.payload.summary).toContain("minimal-project-fixture");
  });

  it("rejects non-read-only Phase 2 workflow definitions", async () => {
    await expect(
      runWorkflow({
        projectRoot: minimalFixtureRoot,
        outputRoot: mkdtempSync(join(tmpdir(), "forgeweave-review-")),
        workflow: {
          ...genericReviewWorkflow,
          steps: [{ ...genericReviewWorkflow.steps[0], readOnly: false }]
        }
      })
    ).rejects.toThrow("Phase 2 workflow step must be read-only");
  });
});
