import { describe, expect, it, vi } from "vitest";

import { renderHelp, renderVersion, runCli } from "./cli.js";

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
});
