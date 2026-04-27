import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import type { FileChange, FileChangeOperation, FileChangeSet } from "@forgeweave/contracts";

import { resolveInside } from "./write-safety.js";

export type FileSnapshot = {
  path: string;
  content?: string;
};

export type CaptureFileChangeSetInput = {
  rootDir: string;
  before: FileSnapshot[];
  after: FileSnapshot[];
  rationale: string;
  risk: string;
};

function hash(content: string | undefined): string | undefined {
  if (content === undefined) return undefined;
  return createHash("sha256").update(content).digest("hex");
}

function readOptional(rootDir: string, path: string): string | undefined {
  const absolutePath = resolveInside(rootDir, path);
  if (!existsSync(absolutePath)) return undefined;
  return readFileSync(absolutePath, "utf8");
}

export function snapshotFiles(rootDir: string, paths: string[]): FileSnapshot[] {
  return paths.map((path) => ({
    path,
    content: readOptional(rootDir, path)
  }));
}

function lineCount(content: string | undefined): number {
  if (content === undefined || content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

function operation(before: string | undefined, after: string | undefined): FileChangeOperation {
  if (before === undefined && after !== undefined) return "create";
  if (before !== undefined && after === undefined) return "delete";
  return "modify";
}

function diffLines(path: string, before: string | undefined, after: string | undefined): string {
  const oldLines = before === undefined ? [] : before.split(/\r?\n/);
  const newLines = after === undefined ? [] : after.split(/\r?\n/);
  const output = [`--- a/${path}`, `+++ b/${path}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`];
  output.push(...oldLines.map((line) => `-${line}`));
  output.push(...newLines.map((line) => `+${line}`));
  return output.join("\n");
}

export function captureFileChangeSet(input: CaptureFileChangeSetInput): FileChangeSet {
  const before = new Map(input.before.map((item) => [item.path, item.content]));
  const after = new Map(input.after.map((item) => [item.path, item.content]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changedFiles: FileChange[] = [];
  const diffs: string[] = [];

  for (const path of paths) {
    const beforeContent = before.get(path);
    const afterContent = after.get(path);
    if (beforeContent === afterContent) continue;

    changedFiles.push({
      path,
      operation: operation(beforeContent, afterContent),
      beforeHash: hash(beforeContent),
      afterHash: hash(afterContent),
      rationale: input.rationale,
      risk: input.risk,
      hunks: [
        {
          oldStart: 1,
          oldLines: lineCount(beforeContent),
          newStart: 1,
          newLines: lineCount(afterContent),
          summary: "Whole-file fixture diff captured for review."
        }
      ]
    });
    diffs.push(diffLines(path, beforeContent, afterContent));
  }

  if (changedFiles.length === 0) {
    throw new Error("No file changes were captured.");
  }

  return {
    schemaVersion: "1.0.0",
    kind: "file-change-set",
    changedFiles,
    unifiedDiff: diffs.join("\n")
  };
}
