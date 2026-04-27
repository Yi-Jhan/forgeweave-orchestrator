import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { recommendAdapter, type AdapterRecommendation } from "./adapter-recommendation.js";
import { generateContextPacket, type ContextPacket } from "./context-packet.js";
import { loadProjectManifest, type LoadedProjectManifest } from "./manifest.js";
import { resolveProviderAssets, type ProviderAssetResolution } from "./provider-assets.js";
import { buildProviderCapabilityMatrix, runMockProviderPreflight, type ProviderCapabilityMatrix } from "./provider-preflight.js";
import { detectProject, type ProjectSignals } from "./project-detector.js";

export type OnboardingReport = {
  schemaVersion: "1.0.0";
  kind: "onboarding-report";
  projectRoot: string;
  manifest: LoadedProjectManifest;
  signals: ProjectSignals;
  adapter: AdapterRecommendation;
  assetResolutions: ProviderAssetResolution[];
  preflightReports: ReturnType<typeof runMockProviderPreflight>[];
  capabilityMatrix: ProviderCapabilityMatrix;
  contextPacket: ContextPacket;
  nextWorkflows: string[];
};

export type RunProjectOnboardingOptions = {
  projectRoot: string;
  writeArtifacts?: boolean;
};

export function buildOnboardingReport(projectRoot: string): OnboardingReport {
  const absoluteRoot = resolve(projectRoot);
  const manifest = loadProjectManifest(absoluteRoot);
  const signals = detectProject(absoluteRoot, manifest.manifest);
  const adapter = recommendAdapter(manifest.manifest, signals);
  const assetResolutions = resolveProviderAssets(absoluteRoot);
  const preflightReports = [
    runMockProviderPreflight("mock-pass"),
    runMockProviderPreflight("mock-degraded"),
    runMockProviderPreflight("mock-fail")
  ];
  const capabilityMatrix = buildProviderCapabilityMatrix(preflightReports);
  const contextPacket = generateContextPacket(manifest.manifest, signals, adapter, assetResolutions);

  return {
    schemaVersion: "1.0.0",
    kind: "onboarding-report",
    projectRoot: absoluteRoot,
    manifest,
    signals,
    adapter,
    assetResolutions,
    preflightReports,
    capabilityMatrix,
    contextPacket,
    nextWorkflows: manifest.manifest.workflows.enabled
  };
}

export function runProjectOnboarding(options: RunProjectOnboardingOptions): OnboardingReport {
  const report = buildOnboardingReport(options.projectRoot);
  if (options.writeArtifacts === true) {
    const outputDir = join(resolve(options.projectRoot), ".forgeweave", "onboarding");
    const outputs = [
      join(outputDir, "onboarding-report.json"),
      join(outputDir, "context-packet.json"),
      join(outputDir, "provider-capability-matrix.json")
    ];
    const existingOutput = outputs.find((output) => existsSync(output));
    if (existingOutput !== undefined) {
      throw new Error(`Refusing to overwrite existing onboarding artifact: ${existingOutput}`);
    }
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputs[0], `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(outputs[1], `${JSON.stringify(report.contextPacket, null, 2)}\n`);
    writeFileSync(outputs[2], `${JSON.stringify(report.capabilityMatrix, null, 2)}\n`);
  }
  return report;
}
