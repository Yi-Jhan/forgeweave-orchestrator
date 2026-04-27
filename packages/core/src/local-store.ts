import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { WorkflowArtifact, WorkflowEventEnvelope } from "@forgeweave/contracts";

import type { WorkflowRunState, WorkflowStepState } from "./state-machine.js";

export type ReviewDecisionRecord = {
  runId: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  decidedAt?: string;
};

export type LocalWorkflowStore = {
  rootDir: string;
  runDir: (runId: string) => string;
  saveRun: (run: WorkflowRunState) => void;
  loadRun: (runId: string) => WorkflowRunState;
  saveStep: (runId: string, step: WorkflowStepState) => void;
  loadSteps: (runId: string) => WorkflowStepState[];
  saveArtifact: (artifact: WorkflowArtifact) => void;
  loadArtifact: (runId: string, artifactId: string) => WorkflowArtifact;
  listArtifacts: (runId: string) => WorkflowArtifact[];
  appendEvent: (event: WorkflowEventEnvelope) => void;
  loadEvents: (runId: string) => WorkflowEventEnvelope[];
  saveReviewDecision: (decision: ReviewDecisionRecord) => void;
  loadReviewDecision: (runId: string) => ReviewDecisionRecord;
};

function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function createLocalWorkflowStore(rootDir: string): LocalWorkflowStore {
  const absoluteRoot = resolve(rootDir);
  ensureDirectory(absoluteRoot);

  const runDir = (runId: string) => join(absoluteRoot, "runs", runId);
  const artifactsDir = (runId: string) => join(runDir(runId), "artifacts");
  const eventsPath = (runId: string) => join(runDir(runId), "events.jsonl");
  const stepsPath = (runId: string) => join(runDir(runId), "steps.json");

  function ensureRunLayout(runId: string): void {
    ensureDirectory(runDir(runId));
    ensureDirectory(artifactsDir(runId));
  }

  return {
    rootDir: absoluteRoot,
    runDir,
    saveRun(run) {
      ensureRunLayout(run.runId);
      writeJson(join(runDir(run.runId), "run.json"), run);
    },
    loadRun(runId) {
      return readJson<WorkflowRunState>(join(runDir(runId), "run.json"));
    },
    saveStep(runId, step) {
      ensureRunLayout(runId);
      const existing = this.loadSteps(runId).filter((item) => item.stepId !== step.stepId);
      writeJson(stepsPath(runId), [...existing, step]);
    },
    loadSteps(runId) {
      try {
        return readJson<WorkflowStepState[]>(stepsPath(runId));
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
        throw error;
      }
    },
    saveArtifact(artifact) {
      ensureRunLayout(artifact.runId);
      writeJson(join(artifactsDir(artifact.runId), `${artifact.artifactId}.json`), artifact);
    },
    loadArtifact(runId, artifactId) {
      return readJson<WorkflowArtifact>(join(artifactsDir(runId), `${artifactId}.json`));
    },
    listArtifacts(runId) {
      try {
        return readdirSync(artifactsDir(runId))
          .filter((file) => file.endsWith(".json"))
          .sort()
          .map((file) => readJson<WorkflowArtifact>(join(artifactsDir(runId), file)));
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
        throw error;
      }
    },
    appendEvent(event) {
      ensureRunLayout(event.runId);
      writeFileSync(eventsPath(event.runId), `${JSON.stringify(event)}\n`, { flag: "a" });
    },
    loadEvents(runId) {
      try {
        return readFileSync(eventsPath(runId), "utf8")
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line) as WorkflowEventEnvelope);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
        throw error;
      }
    },
    saveReviewDecision(decision) {
      ensureRunLayout(decision.runId);
      writeJson(join(runDir(decision.runId), "review-decision.json"), decision);
    },
    loadReviewDecision(runId) {
      return readJson<ReviewDecisionRecord>(join(runDir(runId), "review-decision.json"));
    }
  };
}
