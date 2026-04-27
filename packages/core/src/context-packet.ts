import type { ProjectManifest } from "@forgeweave/contracts";

import type { AdapterRecommendation } from "./adapter-recommendation.js";
import type { ProviderAssetResolution } from "./provider-assets.js";
import type { ProjectSignals } from "./project-detector.js";

export type ContextPacket = {
  schemaVersion: "1.0.0";
  kind: "context-packet";
  projectId: string;
  signals: ProjectSignals;
  commands: Record<string, string>;
  targetFiles: string[];
  assets: ProviderAssetResolution[];
  risks: string[];
  budget: {
    maxFiles: number;
    maxTokens: number;
  };
};

export function generateContextPacket(
  manifest: ProjectManifest,
  signals: ProjectSignals,
  adapter: AdapterRecommendation,
  assets: ProviderAssetResolution[]
): ContextPacket {
  const targetFiles = signals.detectedFiles.length > 0 ? signals.detectedFiles : ["forgeweave.manifest.example.yml"];
  const risks = [...adapter.gaps];
  const requiredAssetGaps = assets.flatMap((asset) => asset.gaps.filter((gap) => gap.severity === "required"));
  if (requiredAssetGaps.length > 0) {
    risks.push("Required provider assets are missing");
  }

  return {
    schemaVersion: "1.0.0",
    kind: "context-packet",
    projectId: manifest.project.id,
    signals,
    commands: manifest.commands,
    targetFiles,
    assets,
    risks,
    budget: {
      maxFiles: 25,
      maxTokens: 12000
    }
  };
}
