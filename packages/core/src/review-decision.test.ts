import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createLocalWorkflowStore } from "./local-store.js";
import { recordReviewDecision } from "./review-decision.js";
import { runWorkflow } from "./workflow-runner.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const minimalFixtureRoot = resolve(repoRoot, "examples/minimal-project");

describe("review decision recording", () => {
  it("approves a waiting review run", async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-review-decision-"));
    await runWorkflow({ projectRoot: minimalFixtureRoot, outputRoot, runId: "run-approve" });

    const result = recordReviewDecision({ outputRoot, runId: "run-approve", decision: "approve" });
    const store = createLocalWorkflowStore(outputRoot);

    expect(result.runStatus).toBe("completed");
    expect(store.loadRun("run-approve").status).toBe("completed");
    expect(store.loadReviewDecision("run-approve").status).toBe("approved");
    expect(store.loadEvents("run-approve").map((event) => event.type)).toContain("review.approved");
  });

  it("rejects with a required reason", async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-review-decision-"));
    await runWorkflow({ projectRoot: minimalFixtureRoot, outputRoot, runId: "run-reject" });

    expect(() => recordReviewDecision({ outputRoot, runId: "run-reject", decision: "reject" })).toThrow(
      "Reject decision requires"
    );
    const result = recordReviewDecision({
      outputRoot,
      runId: "run-reject",
      decision: "reject",
      reason: "Please clarify risk handling."
    });

    expect(result.runStatus).toBe("rejected");
    expect(createLocalWorkflowStore(outputRoot).loadReviewDecision("run-reject").reason).toBe("Please clarify risk handling.");
  });
});
