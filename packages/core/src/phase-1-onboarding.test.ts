import { describe, expect, it } from "vitest";

import { buildOnboardingReport, loadProjectManifest, runMockProviderPreflight } from "./index.js";

describe("phase 1 onboarding core", () => {
  it("loads and normalizes the ACC fixture manifest", () => {
    const loaded = loadProjectManifest("../../examples/acc");

    expect(loaded.manifest.project.id).toBe("acc-fixture");
    expect(loaded.manifest.schemaVersion).toBe("1.0.0");
    expect(loaded.manifest.validation.realProjectRootEnv).toBe("FORGEWEAVE_ACC_ROOT");
  });

  it("builds an onboarding report for the ACC fixture", () => {
    const report = buildOnboardingReport("../../examples/acc");

    expect(report.adapter.recommendedAdapter).toBe("ProjectSpecificAdapter");
    expect(report.contextPacket.projectId).toBe("acc-fixture");
    expect(report.capabilityMatrix.providers).toHaveLength(3);
    expect(report.assetResolutions.length).toBeGreaterThan(0);
  });

  it("builds an onboarding report for the minimal fixture without ACC coupling", () => {
    const report = buildOnboardingReport("../../examples/minimal-project");

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
