import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createControlledWorkdir } from "./workdir-manager.js";
import { defaultFilePolicy, evaluateDirtyState, evaluateFilePolicy } from "./write-safety.js";

describe("Phase 3 write safety guards", () => {
  it("creates a controlled workdir and omits local secret/runtime directories", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "forgeweave-source-"));
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-output-"));
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    mkdirSync(join(projectRoot, ".forgeweave"), { recursive: true });
    writeFileSync(join(projectRoot, "src", "example.ts"), "export const value = 1;\n");
    writeFileSync(join(projectRoot, ".env.local"), "TOKEN=secret\n");
    writeFileSync(join(projectRoot, ".forgeweave", "runtime.json"), "{}\n");

    const workdir = createControlledWorkdir({
      projectRoot,
      outputRoot,
      runId: "run-safety",
      validationMode: "fixture"
    });

    expect(existsSync(join(workdir.workdirRoot, "src", "example.ts"))).toBe(true);
    expect(existsSync(join(workdir.workdirRoot, ".env.local"))).toBe(false);
    expect(existsSync(join(workdir.workdirRoot, ".forgeweave"))).toBe(false);
    expect(workdir.provenance.isGitRepo).toBe(false);
  });

  it("blocks dirty live-patch writes but allows fixture warnings", () => {
    const provenance = {
      isGitRepo: true,
      gitRoot: "/repo",
      branch: "feature",
      head: "abc123",
      dirtyFiles: ["M src/example.ts"],
      warnings: []
    };

    expect(evaluateDirtyState({ provenance, validationMode: "live-patch" }).allowed).toBe(false);
    expect(evaluateDirtyState({ provenance, validationMode: "fixture" }).allowed).toBe(true);
    expect(evaluateDirtyState({ provenance, validationMode: "fixture" }).warnings[0]).toContain("dirty files");
  });

  it("enforces file allowlist, denylist, path traversal, and new-file policy", () => {
    expect(evaluateFilePolicy(defaultFilePolicy, [{ path: "src/example.ts", operation: "modify" }]).allowed).toBe(true);
    expect(evaluateFilePolicy(defaultFilePolicy, [{ path: ".env", operation: "modify" }]).rejections[0]).toContain("denied");
    expect(evaluateFilePolicy(defaultFilePolicy, [{ path: "../outside.ts", operation: "modify" }]).rejections[0]).toContain(
      "escapes"
    );
    expect(evaluateFilePolicy(defaultFilePolicy, [{ path: "docs/readme.md", operation: "modify" }]).rejections[0]).toContain(
      "outside"
    );
    expect(evaluateFilePolicy(defaultFilePolicy, [{ path: "src/new.ts", operation: "create" }]).rejections[0]).toContain(
      "New file"
    );
  });
});
