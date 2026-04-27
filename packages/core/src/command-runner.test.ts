import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ProjectManifest } from "@forgeweave/contracts";
import { describe, expect, it } from "vitest";

import { runAllowedCommand, runValidationCommandSummary } from "./command-runner.js";

const manifest: ProjectManifest = {
  schemaVersion: "1.0.0",
  kind: "project-manifest",
  project: {
    id: "command-fixture",
    name: "Command Fixture",
    type: "fixture",
    framework: "none",
    language: "typescript"
  },
  validation: {
    mode: "fixture",
    realProjectRootEnv: "FORGEWEAVE_SECOND_PROJECT_ROOT"
  },
  commands: {
    lint: "node -e \"console.log('lint ok')\"",
    test: "node -e \"process.exit(2)\""
  },
  workflows: {
    enabled: ["generic.bug-fix"]
  },
  policies: {
    externalNetworkDefault: "blocked",
    humanReviewRequiredFor: ["bug-fix"]
  }
};

describe("Phase 3 command runner", () => {
  it("captures allowed, failed, skipped, and blocked commands", () => {
    const cwd = mkdtempSync(join(tmpdir(), "forgeweave-command-"));
    writeFileSync(join(cwd, "package.json"), "{}\n");

    expect(runAllowedCommand({ manifest, commandName: "lint", cwd }).status).toBe("passed");
    expect(runAllowedCommand({ manifest, commandName: "test", cwd }).status).toBe("failed");
    expect(runAllowedCommand({ manifest, commandName: "build", cwd }).status).toBe("skipped");
    expect(runAllowedCommand({ manifest, commandName: "install", cwd }).status).toBe("blocked");
  });

  it("skips fixture commands when no package.json exists", () => {
    const cwd = mkdtempSync(join(tmpdir(), "forgeweave-command-"));
    mkdirSync(join(cwd, "src"));

    const summary = runValidationCommandSummary({ manifest, cwd });

    expect(summary.overallStatus).toBe("skipped");
    expect(summary.commands.map((command) => command.status)).toEqual(["skipped", "skipped", "skipped"]);
  });
});
