import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const fixtureRoot = join(process.cwd(), "tests", "fixtures", "runtime", "basic-project", ".forgeweave");

describe("runtime fixture layout", () => {
  it("provides the Phase 0 .forgeweave runtime directories", () => {
    expect(existsSync(join(fixtureRoot, "runs"))).toBe(true);
    expect(existsSync(join(fixtureRoot, "artifacts"))).toBe(true);
    expect(existsSync(join(fixtureRoot, "events"))).toBe(true);
  });
});
