import type { ReviewFindings, WorkflowArtifact, WorkflowStepDefinition } from "@forgeweave/contracts";

export type RuntimeSession = {
  sessionId: string;
  provider: string;
  runId: string;
};

export type RuntimeStepContext = {
  runId: string;
  projectRoot: string;
  workflowId: string;
  step: WorkflowStepDefinition;
  artifacts: WorkflowArtifact[];
};

export type RuntimeStepResult = {
  artifacts: WorkflowArtifact[];
  reviewFindings?: ReviewFindings;
  events?: Record<string, unknown>[];
};

export type AgentRuntimeProvider = {
  provider: string;
  createSession: (input: { runId: string; workflowId: string; projectRoot: string }) => Promise<RuntimeSession> | RuntimeSession;
  runStep: (session: RuntimeSession, context: RuntimeStepContext) => Promise<RuntimeStepResult> | RuntimeStepResult;
  resume?: (session: RuntimeSession) => Promise<RuntimeSession> | RuntimeSession;
  close?: (session: RuntimeSession) => Promise<void> | void;
};
