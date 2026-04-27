import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { captureFileChangeSet, snapshotFiles } from "./diff-capture.js";

describe("Phase 3 diff capture", () => {
  it("captures a unified diff and changed file metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "forgeweave-diff-"));
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "message.ts"), "export const message = 'Needs fix';\n");
    const before = snapshotFiles(root, ["src/message.ts"]);
    writeFileSync(join(root, "src", "message.ts"), "export const message = 'Fixed';\n");
    const after = snapshotFiles(root, ["src/message.ts"]);

    const changeSet = captureFileChangeSet({
      rootDir: root,
      before,
      after,
      rationale: "Fix stale label",
      risk: "Low"
    });

    expect(changeSet.changedFiles[0].operation).toBe("modify");
    expect(changeSet.changedFiles[0].beforeHash).not.toBe(changeSet.changedFiles[0].afterHash);
    expect(changeSet.unifiedDiff).toContain("--- a/src/message.ts");
    expect(changeSet.unifiedDiff).toContain("+export const message = 'Fixed';");
  });
});
