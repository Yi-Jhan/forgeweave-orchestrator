import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import type { ValidationMode } from "@forgeweave/contracts";

import {
  defaultFilePolicy,
  evaluateDirtyState,
  inspectGitProvenance,
  normalizeRelativePath,
  type FilePolicy,
  type GitProvenance
} from "./write-safety.js";

export type ControlledWorkdir = {
  runId: string;
  sourceRoot: string;
  workdirRoot: string;
  validationMode: ValidationMode;
  createdAt: string;
  provenance: GitProvenance;
  filePolicy: FilePolicy;
  warnings: string[];
};

export type CreateControlledWorkdirOptions = {
  projectRoot: string;
  outputRoot: string;
  runId: string;
  validationMode?: ValidationMode;
  allowDirty?: boolean;
  filePolicy?: FilePolicy;
};

function shouldCopy(sourceRoot: string, sourcePath: string): boolean {
  const relativePath = relative(sourceRoot, sourcePath);
  if (relativePath.length === 0) return true;

  let normalized: string;
  try {
    normalized = normalizeRelativePath(relativePath);
  } catch {
    return false;
  }

  return !(
    normalized === ".env" ||
    normalized.startsWith(".env.") ||
    normalized === ".git" ||
    normalized.startsWith(".git/") ||
    normalized === "node_modules" ||
    normalized.startsWith("node_modules/") ||
    normalized === ".forgeweave" ||
    normalized.startsWith(".forgeweave/")
  );
}

export function createControlledWorkdir(options: CreateControlledWorkdirOptions): ControlledWorkdir {
  const sourceRoot = resolve(options.projectRoot);
  const workdirRoot = resolve(options.outputRoot, "workdirs", options.runId, "project");
  const validationMode = options.validationMode ?? "fixture";
  const filePolicy = options.filePolicy ?? defaultFilePolicy;

  if (!existsSync(sourceRoot)) {
    throw new Error(`Project root does not exist: ${sourceRoot}`);
  }
  if (existsSync(workdirRoot)) {
    throw new Error(`Controlled workdir already exists: ${workdirRoot}`);
  }

  const provenance = inspectGitProvenance(sourceRoot);
  const dirtyState = evaluateDirtyState({
    provenance,
    validationMode,
    allowDirty: options.allowDirty
  });
  if (!dirtyState.allowed) {
    throw new Error(dirtyState.rejectReason);
  }

  mkdirSync(dirname(workdirRoot), { recursive: true });
  cpSync(sourceRoot, workdirRoot, {
    recursive: true,
    filter: (sourcePath) => shouldCopy(sourceRoot, sourcePath)
  });

  return {
    runId: options.runId,
    sourceRoot,
    workdirRoot,
    validationMode,
    createdAt: new Date().toISOString(),
    provenance,
    filePolicy,
    warnings: dirtyState.warnings
  };
}
