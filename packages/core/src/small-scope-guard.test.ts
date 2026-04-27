import type { RequirementBrief } from "@forgeweave/contracts";
import { describe, expect, it } from "vitest";

import { evaluateSmallScope } from "./small-scope-guard.js";

function requirement(overrides: Partial<RequirementBrief> = {}): RequirementBrief {
  return {
    schemaVersion: "1.0.0",
    kind: "requirement-brief",
    title: "Add fixture helper",
    description: "Add a tiny helper export for fixture tests.",
    targetFiles: ["src/fixture-helper.ts"],
    acceptanceCriteria: ["Helper exports a label."],
    assumptions: ["Fixture-only change."],
    ...overrides
  };
}

describe("small-scope guard", () => {
  it("allows small allowlisted feature requests", () => {
    expect(evaluateSmallScope({ requirement: requirement() }).allowed).toBe(true);
  });

  it("rejects broad feature requests", () => {
    const result = evaluateSmallScope({
      requirement: requirement({
        title: "Migrate whole app",
        description: "Migrate and redesign multiple modules at once."
      })
    });

    expect(result.allowed).toBe(false);
    expect(result.rejectReason).toContain("broader");
  });

  it("rejects too many files and denylisted paths", () => {
    const tooMany = evaluateSmallScope({
      requirement: requirement({
        targetFiles: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"]
      })
    });
    const denied = evaluateSmallScope({
      requirement: requirement({
        targetFiles: [".env"]
      })
    });

    expect(tooMany.allowed).toBe(false);
    expect(tooMany.rejectReason).toContain("maxTargetFiles");
    expect(denied.allowed).toBe(false);
    expect(denied.rejectReason).toContain("denied");
  });
});
