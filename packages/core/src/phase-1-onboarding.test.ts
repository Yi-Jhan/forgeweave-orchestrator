import { describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildOnboardingReport, generateProjectManifest, loadProjectManifest, runMockProviderPreflight } from "./index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const accFixtureRoot = resolve(repoRoot, "examples/acc");
const minimalFixtureRoot = resolve(repoRoot, "examples/minimal-project");

describe("phase 1 onboarding core", () => {
  it("loads and normalizes the ACC fixture manifest", () => {
    const loaded = loadProjectManifest(accFixtureRoot);

    expect(loaded.manifest.project.id).toBe("acc-fixture");
    expect(loaded.manifest.schemaVersion).toBe("1.0.0");
    expect(loaded.manifest.validation.realProjectRootEnv).toBe("FORGEWEAVE_ACC_ROOT");
    expect(loaded.source).toBe("file");
  });

  it("generates an in-memory manifest when a live project has no manifest", () => {
    const generated = generateProjectManifest(minimalFixtureRoot);

    expect(generated.manifestPath).toBe("<generated>");
    expect(generated.source).toBe("generated");
    expect(generated.manifest.validation.mode).toBe("live-readonly");
  });

  it("builds an onboarding report for the ACC fixture", () => {
    const report = buildOnboardingReport(accFixtureRoot);

    expect(report.adapter.recommendedAdapter).toBe("ProjectSpecificAdapter");
    expect(report.contextPacket.projectId).toBe("acc-fixture");
    expect(report.capabilityMatrix.providers).toHaveLength(3);
    expect(report.assetResolutions.length).toBeGreaterThan(0);
  });

  it("builds an onboarding report for the minimal fixture without ACC coupling", () => {
    const report = buildOnboardingReport(minimalFixtureRoot);

    expect(report.adapter.recommendedAdapter).toBe("GenericProjectAdapter");
    expect(report.contextPacket.projectId).toBe("minimal-project-fixture");
    expect(report.nextWorkflows).toContain("generic.review");
  });

  it("returns deterministic mock preflight states", () => {
    expect(runMockProviderPreflight("mock-pass").status).toBe("pass");
    expect(runMockProviderPreflight("mock-degraded").status).toBe("degraded");
    expect(runMockProviderPreflight("mock-fail").missingFeatures).toContain("streaming");
  });
});
