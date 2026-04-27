export type RunStatus = "pending" | "running" | "waiting-review" | "completed" | "rejected" | "failed";
export type StepStatus = "pending" | "running" | "completed" | "waiting-review" | "failed" | "skipped";

const legalRunTransitions: Record<RunStatus, readonly RunStatus[]> = {
  pending: ["running"],
  running: ["waiting-review", "completed", "failed"],
  "waiting-review": ["completed", "rejected", "failed"],
  completed: [],
  rejected: [],
  failed: []
};

const legalStepTransitions: Record<StepStatus, readonly StepStatus[]> = {
  pending: ["running", "skipped"],
  running: ["completed", "waiting-review", "failed"],
  "waiting-review": ["completed", "failed"],
  completed: [],
  failed: [],
  skipped: []
};

export type WorkflowRunState = {
  runId: string;
  workflowId: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
};

export type WorkflowStepState = {
  stepId: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  return legalRunTransitions[from].includes(to);
}

export function canTransitionStep(from: StepStatus, to: StepStatus): boolean {
  return legalStepTransitions[from].includes(to);
}

export function transitionRun(run: WorkflowRunState, nextStatus: RunStatus, timestamp = new Date().toISOString()): WorkflowRunState {
  if (!canTransitionRun(run.status, nextStatus)) {
    throw new Error(`Illegal run transition: ${run.status} -> ${nextStatus}`);
  }

  return {
    ...run,
    status: nextStatus,
    startedAt: run.startedAt ?? (nextStatus === "running" ? timestamp : undefined),
    finishedAt: ["completed", "rejected", "failed"].includes(nextStatus) ? timestamp : run.finishedAt
  };
}

export function transitionStep(
  step: WorkflowStepState,
  nextStatus: StepStatus,
  timestamp = new Date().toISOString(),
  error?: string
): WorkflowStepState {
  if (!canTransitionStep(step.status, nextStatus)) {
    throw new Error(`Illegal step transition: ${step.status} -> ${nextStatus}`);
  }

  return {
    ...step,
    status: nextStatus,
    startedAt: step.startedAt ?? (nextStatus === "running" ? timestamp : undefined),
    finishedAt: ["completed", "failed", "skipped"].includes(nextStatus) ? timestamp : step.finishedAt,
    error
  };
}
