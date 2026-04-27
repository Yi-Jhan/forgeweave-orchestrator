import type { ProjectManifest } from "@forgeweave/contracts";

import type { ProjectSignals } from "./project-detector.js";

export type AdapterRecommendation = {
  recommendedAdapter: "GenericProjectAdapter" | "FrameworkProjectAdapter" | "ProjectSpecificAdapter";
  confidence: "low" | "medium" | "high";
  reasons: string[];
  gaps: string[];
};

export function recommendAdapter(manifest: ProjectManifest, signals: ProjectSignals): AdapterRecommendation {
  const reasons = [`language=${signals.language}`, `framework=${signals.framework}`];
  const gaps: string[] = [];

  if (signals.sourceRoots.length === 0) gaps.push("No source roots detected");
  if (signals.testRoots.length === 0) gaps.push("No test roots detected");
  if (signals.packageManager === "unknown") gaps.push("Package manager could not be inferred");

  if (manifest.project.id.includes("acc") || manifest.project.type.includes("enterprise")) {
    return {
      recommendedAdapter: "ProjectSpecificAdapter",
      confidence: "medium",
      reasons: [...reasons, "fixture profile suggests enterprise/project-specific conventions"],
      gaps
    };
  }

  if (signals.framework !== "none" && signals.framework !== "unknown") {
    return {
      recommendedAdapter: "FrameworkProjectAdapter",
      confidence: gaps.length === 0 ? "high" : "medium",
      reasons,
      gaps
    };
  }

  return {
    recommendedAdapter: "GenericProjectAdapter",
    confidence: gaps.length === 0 ? "high" : "medium",
    reasons,
    gaps
  };
}
