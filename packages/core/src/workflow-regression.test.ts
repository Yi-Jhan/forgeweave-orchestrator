import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runWorkflow } from "./workflow-runner.js";
import { genericBugFixWorkflow } from "./workflows/generic-bug-fix.js";
import { genericNewFeatureWorkflow } from "./workflows/generic-new-feature.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const accFixtureRoot = resolve(repoRoot, "examples/acc");
const minimalFixtureRoot = resolve(repoRoot, "examples/minimal-project");

describe("P2/P3 workflow regression suite", () => {
  it("keeps review, bug-fix, and new-feature workflows runnable on fixtures", async () => {
    const review = await runWorkflow({
      projectRoot: minimalFixtureRoot,
      outputRoot: mkdtempSync(join(tmpdir(), "forgeweave-regression-review-")),
      runId: "regression-review"
    });
    const accBugFix = await runWorkflow({
      workflow: genericBugFixWorkflow,
      projectRoot: accFixtureRoot,
      outputRoot: mkdtempSync(join(tmpdir(), "forgeweave-regression-bug-")),
      runId: "regression-bug",
      brief: "Fix regression status label."
    });
    const minimalFeature = await runWorkflow({
      workflow: genericNewFeatureWorkflow,
      projectRoot: minimalFixtureRoot,
      outputRoot: mkdtempSync(join(tmpdir(), "forgeweave-regression-feature-")),
      runId: "regression-feature",
      brief: "Add a minimal fixture helper."
    });

    expect(review.run.status).toBe("waiting-review");
    expect(accBugFix.artifacts.map((artifact) => artifact.kind)).toContain("file-change-set");
    expect(minimalFeature.artifacts.map((artifact) => artifact.kind)).toEqual(
      expect.arrayContaining(["requirement-brief", "feature-spec", "implementation-plan", "file-change-set"])
    );
  });
});
