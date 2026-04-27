import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function readFixtureFile(...segments: string[]): string {
  return readFileSync(join(repoRoot, ...segments), "utf8");
}

describe("reference project fixture shells", () => {
  it("provides a sanitized ACC fixture shell", () => {
    const accRoot = join(repoRoot, "examples", "acc");
    const manifest = readFixtureFile("examples", "acc", "forgeweave.manifest.example.yml");
    const readme = readFixtureFile("examples", "acc", "README.md");

    expect(existsSync(join(accRoot, "fixtures", "legacy-page"))).toBe(true);
    expect(existsSync(join(accRoot, "fixtures", "modern-target"))).toBe(true);
    expect(manifest).toContain("mode: fixture");
    expect(manifest).toContain("FORGEWEAVE_ACC_ROOT");
    expect(readme).toContain("sanitized ACC fixture");
  });

  it("provides a minimal-project fixture shell", () => {
    const minimalRoot = join(repoRoot, "examples", "minimal-project");
    const manifest = readFixtureFile("examples", "minimal-project", "forgeweave.manifest.example.yml");

    expect(existsSync(join(minimalRoot, "src"))).toBe(true);
    expect(existsSync(join(minimalRoot, "tests"))).toBe(true);
    expect(manifest).toContain("mode: fixture");
    expect(manifest).toContain("FORGEWEAVE_SECOND_PROJECT_ROOT");
  });
});
