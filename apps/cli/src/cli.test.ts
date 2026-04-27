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

  it("handles --help as a successful smoke command", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    expect(runCli(["--help"], { stdout, stderr })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Usage: forgeweave"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs init in dry-run mode against the ACC fixture", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    expect(runCli(["init", "--project-root", accFixtureRoot, "--dry-run"], { stdout, stderr })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("ForgeWeave init completed for acc-fixture"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Mode: dry-run"));
    expect(stderr).not.toHaveBeenCalled();
  });

  it("runs init in dry-run mode against the minimal fixture", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    expect(runCli(["init", "--project-root", minimalFixtureRoot, "--dry-run"], { stdout, stderr })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("minimal-project-fixture"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("GenericProjectAdapter"));
    expect(stderr).not.toHaveBeenCalled();
  });
});
