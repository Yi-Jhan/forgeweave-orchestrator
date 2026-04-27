import { describe, expect, it } from "vitest";

import { validateProjectManifest } from "./project-manifest.js";
import { validateProviderAssetProfile } from "./provider-asset-profile.js";
import { validateProviderPreflightReport } from "./provider-preflight-report.js";

describe("phase 1 contracts", () => {
  it("validates project manifests", () => {
    expect(
      validateProjectManifest({
        schemaVersion: "1.0.0",
        kind: "project-manifest",
        project: {
          id: "acc-fixture",
          name: "ACC Fixture",
          type: "angular-enterprise-fixture",
          framework: "angular",
          language: "typescript"
        },
        validation: {
          mode: "fixture",
          realProjectRootEnv: "FORGEWEAVE_ACC_ROOT"
        },
        commands: {
          install: "npm ci",
          test: "npm run test"
        },
        workflows: {
          enabled: ["generic.review"]
        },
        policies: {
          externalNetworkDefault: "blocked",
          humanReviewRequiredFor: ["migration"]
        }
      }).valid
    ).toBe(true);

    expect(validateProjectManifest({ kind: "project-manifest" }).valid).toBe(false);
  });

  it("validates provider asset profiles", () => {
    expect(
      validateProviderAssetProfile({
        schemaVersion: "1.0.0",
        kind: "provider-asset-profile",
        provider: "github_copilot",
        assets: [{ kind: "instructions", path: ".github/copilot-instructions.md", required: false }]
      }).valid
    ).toBe(true);

    expect(
      validateProviderAssetProfile({
        schemaVersion: "1.0.0",
        kind: "provider-asset-profile",
        provider: "",
        assets: [{ kind: "unknown", path: "", required: "yes" }]
      }).valid
    ).toBe(false);
  });

  it("validates provider preflight reports", () => {
    expect(
      validateProviderPreflightReport({
        schemaVersion: "1.0.0",
        kind: "provider-preflight-report",
        provider: "mock",
        status: "degraded",
        capabilities: {
          streaming: "supported",
          hooks: "unsupported"
        },
        missingFeatures: ["hooks"],
        degradedModes: ["tool-events unavailable"]
      }).valid
    ).toBe(true);

    expect(validateProviderPreflightReport({ status: "maybe" }).valid).toBe(false);
  });
});
