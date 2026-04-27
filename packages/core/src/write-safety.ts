import { execFileSync } from "node:child_process";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

import type { ValidationMode } from "@forgeweave/contracts";

export type GitProvenance = {
  isGitRepo: boolean;
  gitRoot?: string;
  branch?: string;
  head?: string;
  dirtyFiles: string[];
  warnings: string[];
};

export type DirtyStateEvaluation = {
  allowed: boolean;
  rejectReason?: string;
  warnings: string[];
};

export type FileOperation = "create" | "modify" | "delete";

export type FileChangeRequest = {
  path: string;
  operation: FileOperation;
};

export type FilePolicy = {
  allow: string[];
  deny: string[];
  allowNewFiles: boolean;
  maxFiles: number;
};

export type FilePolicyEvaluation = {
  allowed: boolean;
  rejections: string[];
  warnings: string[];
};

export const defaultFilePolicy: FilePolicy = {
  allow: ["src/**", "tests/**", "fixtures/**", "README.md"],
  deny: [".git/**", "node_modules/**", ".forgeweave/**", ".env", ".env.*", "**/*.pem", "**/*.key"],
  allowNewFiles: false,
  maxFiles: 5
};

function git(cwd: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return undefined;
  }
}

function toSlashPath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function inspectGitProvenance(projectRoot: string): GitProvenance {
  const absoluteRoot = resolve(projectRoot);
  const gitRoot = git(absoluteRoot, ["rev-parse", "--show-toplevel"]);
  if (gitRoot === undefined) {
    return {
      isGitRepo: false,
      dirtyFiles: [],
      warnings: ["Project root is not inside a git repository."]
    };
  }

  const branch = git(absoluteRoot, ["branch", "--show-current"]);
  const head = git(absoluteRoot, ["rev-parse", "--short", "HEAD"]);
  const status = git(absoluteRoot, ["status", "--short", "--", absoluteRoot]) ?? "";
  const dirtyFiles = status
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    isGitRepo: true,
    gitRoot: resolve(gitRoot),
    branch: branch && branch.length > 0 ? branch : undefined,
    head: head && head.length > 0 ? head : undefined,
    dirtyFiles,
    warnings: []
  };
}

export function evaluateDirtyState(input: {
  provenance: GitProvenance;
  validationMode: ValidationMode;
  allowDirty?: boolean;
}): DirtyStateEvaluation {
  if (input.provenance.dirtyFiles.length === 0) {
    return { allowed: true, warnings: input.provenance.warnings };
  }

  if (input.validationMode === "live-patch" && input.allowDirty !== true) {
    return {
      allowed: false,
      rejectReason: "live-patch mode requires a clean git working tree before workspace writes.",
      warnings: input.provenance.warnings
    };
  }

  return {
    allowed: true,
    warnings: [
      ...input.provenance.warnings,
      `${input.validationMode} mode detected dirty files and will record them as provenance warnings.`
    ]
  };
}

export function normalizeRelativePath(path: string): string {
  const normalized = toSlashPath(normalize(path)).replace(/^\.\/+/, "");
  if (normalized.length === 0 || normalized === ".") {
    throw new Error("File path must not be empty.");
  }
  if (isAbsolute(path) || normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) {
    throw new Error(`File path escapes the project root: ${path}`);
  }
  return normalized;
}

function patternMatches(path: string, pattern: string): boolean {
  const normalizedPattern = toSlashPath(pattern);
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.startsWith("**/*")) {
    return path.endsWith(normalizedPattern.slice(4));
  }
  if (normalizedPattern.endsWith(".*")) {
    return path.startsWith(normalizedPattern.slice(0, -1));
  }
  return path === normalizedPattern;
}

export function evaluateFilePolicy(policy: FilePolicy, changes: FileChangeRequest[]): FilePolicyEvaluation {
  const rejections: string[] = [];
  const warnings: string[] = [];

  if (changes.length > policy.maxFiles) {
    rejections.push(`File change set exceeds maxFiles=${policy.maxFiles}.`);
  }

  for (const change of changes) {
    let relativePath: string;
    try {
      relativePath = normalizeRelativePath(change.path);
    } catch (error) {
      rejections.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    if (change.operation === "create" && !policy.allowNewFiles) {
      rejections.push(`New file is not allowed by policy: ${relativePath}`);
      continue;
    }

    if (policy.deny.some((pattern) => patternMatches(relativePath, pattern))) {
      rejections.push(`File is denied by policy: ${relativePath}`);
      continue;
    }

    if (!policy.allow.some((pattern) => patternMatches(relativePath, pattern))) {
      rejections.push(`File is outside allowlist: ${relativePath}`);
    }
  }

  return {
    allowed: rejections.length === 0,
    rejections,
    warnings
  };
}

export function resolveInside(rootDir: string, relativePath: string): string {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const absoluteRoot = resolve(rootDir);
  const absoluteTarget = resolve(absoluteRoot, normalizedRelativePath);
  const relativeToRoot = relative(absoluteRoot, absoluteTarget);

  if (relativeToRoot.startsWith("..") || isAbsolute(relativeToRoot)) {
    throw new Error(`Resolved path escapes root: ${relativePath}`);
  }

  return absoluteTarget.split(sep).join(sep);
}
