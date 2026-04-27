import { describe, expect, it } from "vitest";

import { canTransitionRun, canTransitionStep, transitionRun, transitionStep } from "./state-machine.js";

describe("phase 2 state machine", () => {
  it("allows minimal legal run transitions", () => {
    const running = transitionRun({ runId: "run-1", workflowId: "generic.review", status: "pending" }, "running", "t1");
    const waiting = transitionRun(running, "waiting-review", "t2");
    const completed = transitionRun(waiting, "completed", "t3");

    expect(running.startedAt).toBe("t1");
    expect(waiting.status).toBe("waiting-review");
    expect(completed.finishedAt).toBe("t3");
  });

  it("rejects illegal run transitions", () => {
    expect(canTransitionRun("completed", "running")).toBe(false);
    expect(() => transitionRun({ runId: "run-1", workflowId: "generic.review", status: "completed" }, "running")).toThrow(
      "Illegal run transition"
    );
  });

  it("allows and rejects step transitions", () => {
    const running = transitionStep({ stepId: "review", status: "pending" }, "running", "t1");
    const completed = transitionStep(running, "completed", "t2");

    expect(canTransitionStep("running", "completed")).toBe(true);
    expect(completed.finishedAt).toBe("t2");
    expect(() => transitionStep(completed, "running")).toThrow("Illegal step transition");
  });
});
