import { describe, expect, it, vi } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderHelp, renderVersion, runCli } from "./cli.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const accFixtureRoot = resolve(repoRoot, "examples/acc");
const minimalFixtureRoot = resolve(repoRoot, "examples/minimal-project");

describe("forgeweave CLI skeleton", () => {
  it("renders help output", () => {
    expect(renderHelp()).toContain("Usage: forgeweave");
  });

  it("renders version output", () => {
    expect(renderVersion()).toBe("forgeweave 0.0.0");
  });

  it("handles --help as a successful smoke command", async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(["--help"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Usage: forgeweave"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs init in dry-run mode against the ACC fixture", async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(["init", "--project-root", accFixtureRoot, "--dry-run"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("ForgeWeave init completed for acc-fixture"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Mode: dry-run"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs init in dry-run mode against the minimal fixture", async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(["init", "--project-root", minimalFixtureRoot, "--dry-run"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("minimal-project-fixture"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("GenericProjectAdapter"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs generic.review and inspects persisted artifacts", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-cli-review-"));
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(
      runCli(
        ["run", "generic.review", "--project-root", accFixtureRoot, "--output-root", outputRoot, "--run-id", "cli-run"],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Status: waiting-review"));

    await expect(runCli(["status", "--output-root", outputRoot, "--run-id", "cli-run"], { stdout, stderr })).resolves.toBe(0);
    await expect(runCli(["artifacts", "--output-root", outputRoot, "--run-id", "cli-run"], { stdout, stderr })).resolves.toBe(0);

    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("review-findings"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("approves and rejects review gates", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const approveOutput = mkdtempSync(join(tmpdir(), "forgeweave-cli-review-"));
    const rejectOutput = mkdtempSync(join(tmpdir(), "forgeweave-cli-review-"));
    const stdout = vi.fn();
    const stderr = vi.fn();

    await runCli(
      ["run", "generic.review", "--project-root", minimalFixtureRoot, "--output-root", approveOutput, "--run-id", "approve-run"],
      { stdout, stderr }
    );
    await expect(runCli(["review", "approve", "--output-root", approveOutput, "--run-id", "approve-run"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Review decision: approved"));

    await runCli(
      ["run", "generic.review", "--project-root", minimalFixtureRoot, "--output-root", rejectOutput, "--run-id", "reject-run"],
      { stdout, stderr }
    );
    await expect(
      runCli(
        ["review", "reject", "--output-root", rejectOutput, "--run-id", "reject-run", "--reason", "Needs more detail"],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Review decision: rejected (Needs more detail)"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs ACC fixture generic.bug-fix and reruns validation after rejection", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const outputRoot = mkdtempSync(join(tmpdir(), "forgeweave-cli-bugfix-"));
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(
      runCli(
        [
          "run",
          "generic.bug-fix",
          "--project-root",
          accFixtureRoot,
          "--output-root",
          outputRoot,
          "--run-id",
          "acc-bug",
          "--brief",
          "Fix stale status card label."
        ],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Workflow: generic.bug-fix"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Status: waiting-review"));

    await expect(runCli(["artifacts", "--output-root", outputRoot, "--run-id", "acc-bug"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("file-change-set"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("command-summary"));

    await expect(
      runCli(
        ["review", "reject", "--output-root", outputRoot, "--run-id", "acc-bug", "--reason", "Please rerun validation commands."],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    await expect(runCli(["status", "--output-root", outputRoot, "--run-id", "acc-bug"], { stdout, stderr })).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Recovery: forgeweave rerun"));

    await expect(
      runCli(["rerun", "--output-root", outputRoot, "--run-id", "acc-bug", "--step-id", "validate"], { stdout, stderr })
    ).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Reject reason: Please rerun validation commands."));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("rerun-summary"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs generic.new-feature on ACC and minimal fixtures", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const accOutput = mkdtempSync(join(tmpdir(), "forgeweave-cli-feature-acc-"));
    const minimalOutput = mkdtempSync(join(tmpdir(), "forgeweave-cli-feature-minimal-"));
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(
      runCli(
        [
          "run",
          "generic.new-feature",
          "--project-root",
          accFixtureRoot,
          "--output-root",
          accOutput,
          "--run-id",
          "acc-feature",
          "--brief",
          "Add ACC fixture feature helper."
        ],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Workflow: generic.new-feature"));

    await expect(
      runCli(
        [
          "run",
          "generic.new-feature",
          "--project-root",
          minimalFixtureRoot,
          "--output-root",
          minimalOutput,
          "--run-id",
          "minimal-feature",
          "--brief",
          "Add minimal fixture feature helper."
        ],
        { stdout, stderr }
      )
    ).resolves.toBe(0);
    await expect(runCli(["artifacts", "--output-root", minimalOutput, "--run-id", "minimal-feature"], { stdout, stderr })).resolves.toBe(
      0
    );
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("feature-spec"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("implementation-plan"));
    expect(stderr).not.toHaveBeenCalled();
  });
});
