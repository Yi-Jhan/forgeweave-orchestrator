import type { RequirementBrief } from "@forgeweave/contracts";

import { defaultFilePolicy, evaluateFilePolicy, type FilePolicy } from "./write-safety.js";

export type SmallScopeEvaluation = {
  allowed: boolean;
  rejectReason?: string;
  risks: string[];
};

export type SmallScopeGuardOptions = {
  requirement: RequirementBrief;
  filePolicy?: FilePolicy;
  allowNewFiles?: boolean;
  maxTargetFiles?: number;
  maxDescriptionLength?: number;
};

const broadScopePatterns = [
  /\bmigration\b/i,
  /\bmigrate\b/i,
  /\brefactor\b/i,
  /\bredesign\b/i,
  /\brewrite\b/i,
  /\bmultiple modules?\b/i,
  /\bwhole app\b/i,
  /\barchitecture\b/i
];

export function evaluateSmallScope(options: SmallScopeGuardOptions): SmallScopeEvaluation {
  const maxTargetFiles = options.maxTargetFiles ?? 3;
  const maxDescriptionLength = options.maxDescriptionLength ?? 600;
  const filePolicy = {
    ...(options.filePolicy ?? defaultFilePolicy),
    allowNewFiles: options.allowNewFiles ?? true
  };
  const risks: string[] = [];
  const rejections: string[] = [];

  if (options.requirement.targetFiles.length > maxTargetFiles) {
    rejections.push(`Requirement targets ${options.requirement.targetFiles.length} files; maxTargetFiles=${maxTargetFiles}.`);
  }

  if (options.requirement.description.length > maxDescriptionLength) {
    rejections.push(`Requirement description exceeds maxDescriptionLength=${maxDescriptionLength}.`);
  }

  const combinedText = `${options.requirement.title}\n${options.requirement.description}`;
  const broadPattern = broadScopePatterns.find((pattern) => pattern.test(combinedText));
  if (broadPattern !== undefined) {
    rejections.push("Requirement appears broader than Phase 3 small-scope delivery.");
  }

  const fileEvaluation = evaluateFilePolicy(
    filePolicy,
    options.requirement.targetFiles.map((path) => ({ path, operation: "create" }))
  );
  rejections.push(...fileEvaluation.rejections);
  risks.push(...fileEvaluation.warnings);

  if (options.requirement.targetFiles.length > 1) {
    risks.push("Multiple target files require careful review even within small-scope limits.");
  }

  return {
    allowed: rejections.length === 0,
    rejectReason: rejections.length > 0 ? rejections.join(" ") : undefined,
    risks
  };
}
