import { existsSync } from "node:fs";
import { join } from "node:path";

import type { ProviderAssetProfile } from "@forgeweave/contracts";

export type ProviderAssetGap = {
  path: string;
  kind: string;
  severity: "required" | "optional";
  message: string;
};

export type ProviderAssetResolution = {
  provider: string;
  found: Array<{ kind: string; path: string }>;
  gaps: ProviderAssetGap[];
};

export const defaultProviderAssetProfiles: ProviderAssetProfile[] = [
  {
    schemaVersion: "1.0.0",
    kind: "provider-asset-profile",
    provider: "github_copilot",
    assets: [
      { kind: "instructions", path: ".github/copilot-instructions.md", required: false },
      { kind: "workflow", path: ".github/workflows", required: false }
    ]
  },
  {
    schemaVersion: "1.0.0",
    kind: "provider-asset-profile",
    provider: "generic_agent",
    assets: [
      { kind: "instructions", path: "AGENTS.md", required: false },
      { kind: "skill", path: ".agents/skills", required: false }
    ]
  }
];

export function resolveProviderAssets(
  projectRoot: string,
  profiles: ProviderAssetProfile[] = defaultProviderAssetProfiles
): ProviderAssetResolution[] {
  return profiles.map((profile) => {
    const found: Array<{ kind: string; path: string }> = [];
    const gaps: ProviderAssetGap[] = [];

    for (const asset of profile.assets) {
      const exists = existsSync(join(projectRoot, asset.path));
      if (exists) {
        found.push({ kind: asset.kind, path: asset.path });
      } else {
        gaps.push({
          kind: asset.kind,
          path: asset.path,
          severity: asset.required ? "required" : "optional",
          message: `${profile.provider} ${asset.kind} asset not found at ${asset.path}`
        });
      }
    }

    return { provider: profile.provider, found, gaps };
  });
}
