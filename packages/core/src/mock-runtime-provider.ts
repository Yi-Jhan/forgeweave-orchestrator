import { basename, resolve } from "node:path";

import type { ReviewFindings, WorkflowArtifact } from "@forgeweave/contracts";

import type { AgentRuntimeProvider, RuntimeStepContext } from "./runtime-provider.js";

function buildReviewFindings(context: RuntimeStepContext): ReviewFindings {
  const projectName = basename(resolve(context.projectRoot));
  const contextArtifact = context.artifacts.find((artifact) => artifact.kind === "context-packet");
  const projectId = typeof contextArtifact?.payload.projectId === "string" ? contextArtifact.payload.projectId : projectName;

  return {
    schemaVersion: "1.0.0",
    kind: "review-findings",
    summary: `Mock read-only review completed for ${projectId}.`,
    findings: [
      {
        id: "FW-R-001",
        severity: "info",
        title: "Read-only review completed",
        detail: "The mock runtime inspected onboarding context and produced deterministic review findings."
      }
    ],
    risks: ["Fixture review does not inspect private live source code."],
    nextActions: ["Approve or reject the manual review gate."]
  };
}

export function createMockRuntimeProvider(): AgentRuntimeProvider {
  return {
    provider: "mock",
    createSession(input) {
      return {
        sessionId: `mock-session-${input.runId}`,
        provider: "mock",
        runId: input.runId
      };
    },
    runStep(session, context) {
      const findings = buildReviewFindings(context);
      const artifact: WorkflowArtifact = {
        schemaVersion: "1.0.0",
        kind: "review-findings",
        artifactId: `${context.runId}-review-findings`,
        runId: context.runId,
        status: "ready",
        producedBy: {
          stepId: context.step.id,
          provider: session.provider
        },
        refs: [],
        payload: findings as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString()
      };

      return {
        artifacts: [artifact],
        reviewFindings: findings,
        events: [{ message: "mock review completed" }]
      };
    },
    close() {
      return undefined;
    }
  };
}
