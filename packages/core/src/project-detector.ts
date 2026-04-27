import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { ProjectManifest } from "@forgeweave/contracts";

export type ProjectSignals = {
  projectRoot: string;
  language: string;
  framework: string;
  packageManager: "pnpm" | "npm" | "yarn" | "unknown";
  sourceRoots: string[];
  testRoots: string[];
  commandNames: string[];
  detectedFiles: string[];
};

function hasFile(projectRoot: string, file: string): boolean {
  return existsSync(join(projectRoot, file));
}

function readPackageJson(projectRoot: string): Record<string, unknown> | undefined {
  const packagePath = join(projectRoot, "package.json");
  if (!existsSync(packagePath)) return undefined;
  return JSON.parse(readFileSync(packagePath, "utf8")) as Record<string, unknown>;
}

export function detectProject(projectRoot: string, manifest: ProjectManifest): ProjectSignals {
  const absoluteRoot = resolve(projectRoot);
  const packageJson = readPackageJson(absoluteRoot);
  const detectedFiles = [
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "tsconfig.json",
    "angular.json"
  ].filter((file) => hasFile(absoluteRoot, file));

  const packageManager = hasFile(absoluteRoot, "pnpm-lock.yaml")
    ? "pnpm"
    : hasFile(absoluteRoot, "yarn.lock")
      ? "yarn"
      : hasFile(absoluteRoot, "package-lock.json") || packageJson !== undefined
        ? "npm"
        : "unknown";

  const sourceRoots = ["src", "app", "lib", "fixtures"].filter((path) => existsSync(join(absoluteRoot, path)));
  const testRoots = ["test", "tests", "spec"].filter((path) => existsSync(join(absoluteRoot, path)));
  const commandNames = Object.keys(manifest.commands);

  return {
    projectRoot: absoluteRoot,
    language: manifest.project.language,
    framework: hasFile(absoluteRoot, "angular.json") ? "angular" : manifest.project.framework,
    packageManager,
    sourceRoots,
    testRoots,
    commandNames,
    detectedFiles
  };
}
