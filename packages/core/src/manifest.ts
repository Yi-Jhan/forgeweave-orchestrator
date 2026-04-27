import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  validateProjectManifest,
  type ProjectManifest
} from "@forgeweave/contracts";

const manifestCandidates = [
  "forgeweave.manifest.yml",
  "forgeweave.manifest.yaml",
  "forgeweave.manifest.json",
  "forgeweave.manifest.example.yml",
  "forgeweave.manifest.example.yaml",
  "forgeweave.manifest.example.json"
];

export type LoadedProjectManifest = {
  manifestPath: string;
  manifest: ProjectManifest;
  source: "file" | "generated";
};

type ParseFrame = {
  indent: number;
  value: Record<string, unknown> | unknown[];
};

function coerceScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  return trimmed;
}

function assignValue(target: Record<string, unknown> | unknown[], key: string | undefined, value: unknown): void {
  if (Array.isArray(target)) {
    target.push(value);
    return;
  }
  if (key === undefined) {
    throw new Error("YAML parser expected an object key");
  }
  target[key] = value;
}

export function parseSimpleYaml(source: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: ParseFrame[] = [{ indent: -1, value: root }];
  const pendingKeys = new Map<number, string>();

  for (const rawLine of source.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "");
    if (withoutComment.trim().length === 0) continue;

    const indent = withoutComment.length - withoutComment.trimStart().length;
    const line = withoutComment.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (line.startsWith("- ")) {
      const item = coerceScalar(line.slice(2));
      if (!Array.isArray(parent)) {
        throw new Error(`Unsupported YAML list placement: ${rawLine}`);
      }
      parent.push(item);
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      throw new Error(`Unsupported YAML line: ${rawLine}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (rawValue.length > 0) {
      assignValue(parent, key, coerceScalar(rawValue));
      continue;
    }

    const nextIndent = indent + 2;
    pendingKeys.set(nextIndent, key);
    const container: Record<string, unknown> | unknown[] = source
      .split(/\r?\n/)
      .slice(source.split(/\r?\n/).indexOf(rawLine) + 1)
      .find((candidate) => candidate.trim().length > 0 && candidate.length - candidate.trimStart().length > indent)
      ?.trimStart()
      .startsWith("- ")
      ? []
      : {};
    assignValue(parent, key, container);
    stack.push({ indent, value: container });
  }

  pendingKeys.clear();
  return root;
}

function readManifestFile(manifestPath: string): Record<string, unknown> {
  const source = readFileSync(manifestPath, "utf8");
  if (manifestPath.endsWith(".json")) {
    return JSON.parse(source) as Record<string, unknown>;
  }
  return parseSimpleYaml(source);
}

function normalizeValidation(raw: Record<string, unknown>): ProjectManifest["validation"] {
  const validation = raw.validation as Record<string, unknown> | undefined;
  return {
    mode: (validation?.mode ?? "fixture") as ProjectManifest["validation"]["mode"],
    realProjectRootEnv: String(validation?.realProjectRootEnv ?? validation?.real_project_root_env ?? "FORGEWEAVE_ACC_ROOT")
  };
}

function normalizePolicies(raw: Record<string, unknown>): ProjectManifest["policies"] {
  const policies = raw.policies as Record<string, unknown> | undefined;
  return {
    externalNetworkDefault: String(
      policies?.externalNetworkDefault ?? policies?.external_network_default ?? "blocked"
    ) as ProjectManifest["policies"]["externalNetworkDefault"],
    humanReviewRequiredFor: (policies?.humanReviewRequiredFor ??
      policies?.human_review_required_for ??
      []) as string[]
  };
}

export function normalizeProjectManifest(raw: Record<string, unknown>): ProjectManifest {
  const project = raw.project as ProjectManifest["project"];
  const commands = (raw.commands ?? {}) as Record<string, string>;
  const workflows = raw.workflows as { enabled?: string[] } | undefined;

  const manifest = {
    schemaVersion: raw.schemaVersion ?? "1.0.0",
    kind: raw.kind ?? "project-manifest",
    project,
    validation: normalizeValidation(raw),
    commands,
    workflows: {
      enabled: workflows?.enabled ?? []
    },
    policies: normalizePolicies(raw)
  } as ProjectManifest;

  const validation = validateProjectManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid project manifest: ${validation.errors.join("; ")}`);
  }

  return manifest;
}

export function findProjectManifest(projectRoot: string): string | undefined {
  const absoluteRoot = resolve(projectRoot);
  return manifestCandidates
    .map((candidate) => join(absoluteRoot, candidate))
    .find((candidate) => existsSync(candidate));
}

export function loadProjectManifest(projectRoot: string): LoadedProjectManifest {
  const manifestPath = findProjectManifest(projectRoot);
  if (manifestPath === undefined) {
    throw new Error(`No ForgeWeave manifest found in ${resolve(projectRoot)}`);
  }

  return {
    manifestPath,
    manifest: normalizeProjectManifest(readManifestFile(manifestPath)),
    source: "file"
  };
}

function safeProjectId(projectRoot: string): string {
  return basename(resolve(projectRoot))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function readPackageName(projectRoot: string): string | undefined {
  const packagePath = join(resolve(projectRoot), "package.json");
  if (!existsSync(packagePath)) return undefined;
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: unknown };
  return typeof packageJson.name === "string" && packageJson.name.length > 0 ? packageJson.name : undefined;
}

export function generateProjectManifest(projectRoot: string): LoadedProjectManifest {
  const absoluteRoot = resolve(projectRoot);
  const hasTsConfig = existsSync(join(absoluteRoot, "tsconfig.json"));
  const hasAngularConfig = existsSync(join(absoluteRoot, "angular.json"));
  const packageName = readPackageName(absoluteRoot);

  return {
    manifestPath: "<generated>",
    source: "generated",
    manifest: normalizeProjectManifest({
      project: {
        id: safeProjectId(absoluteRoot),
        name: packageName ?? basename(absoluteRoot),
        type: hasAngularConfig ? "angular-project" : "generic-project",
        framework: hasAngularConfig ? "angular" : "none",
        language: hasTsConfig ? "typescript" : "unknown"
      },
      validation: {
        mode: "live-readonly",
        realProjectRootEnv: "FORGEWEAVE_ACC_ROOT"
      },
      commands: {},
      workflows: {
        enabled: ["generic.review"]
      },
      policies: {
        externalNetworkDefault: "blocked",
        humanReviewRequiredFor: []
      }
    })
  };
}

export function loadOrGenerateProjectManifest(projectRoot: string): LoadedProjectManifest {
  const manifestPath = findProjectManifest(projectRoot);
  if (manifestPath !== undefined) {
    return loadProjectManifest(projectRoot);
  }
  return generateProjectManifest(projectRoot);
}
