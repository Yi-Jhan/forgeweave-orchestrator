export const workflowEventEnvelopeSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/workflow-event-envelope.schema.json",
  title: "ForgeWeaveWorkflowEventEnvelope",
  type: "object",
  required: ["schemaVersion", "kind", "eventId", "runId", "type", "timestamp", "payload"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "workflow-event" },
    eventId: { type: "string", minLength: 1 },
    runId: { type: "string", minLength: 1 },
    stepId: { type: "string", minLength: 1 },
    artifactId: { type: "string", minLength: 1 },
    type: {
      type: "string",
      enum: [
        "run.started",
        "run.completed",
        "run.failed",
        "step.started",
        "step.completed",
        "step.failed",
        "artifact.created",
        "review.requested",
        "review.approved",
        "review.rejected"
      ]
    },
    timestamp: { type: "string", minLength: 1 },
    payload: { type: "object" }
  }
} as const;

export type WorkflowEventType =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "step.started"
  | "step.completed"
  | "step.failed"
  | "artifact.created"
  | "review.requested"
  | "review.approved"
  | "review.rejected";

export type WorkflowEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  schemaVersion: "1.0.0";
  kind: "workflow-event";
  eventId: string;
  runId: string;
  stepId?: string;
  artifactId?: string;
  type: WorkflowEventType;
  timestamp: string;
  payload: TPayload;
};

export type WorkflowEventValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const eventTypes = new Set<string>([
  "run.started",
  "run.completed",
  "run.failed",
  "step.started",
  "step.completed",
  "step.failed",
  "artifact.created",
  "review.requested",
  "review.approved",
  "review.rejected"
]);

export function validateWorkflowEventEnvelope(value: unknown): WorkflowEventValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["event envelope must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "workflow-event") errors.push("kind must be workflow-event");
  for (const key of ["eventId", "runId", "timestamp"]) {
    if (!isNonEmptyString(value[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (value.stepId !== undefined && !isNonEmptyString(value.stepId)) errors.push("stepId must be a non-empty string");
  if (value.artifactId !== undefined && !isNonEmptyString(value.artifactId)) {
    errors.push("artifactId must be a non-empty string");
  }
  if (!eventTypes.has(String(value.type))) errors.push("type must be a supported workflow event type");
  if (!isRecord(value.payload)) errors.push("payload must be an object");

  return { valid: errors.length === 0, errors };
}

export function isWorkflowEventEnvelope(value: unknown): value is WorkflowEventEnvelope {
  return validateWorkflowEventEnvelope(value).valid;
}
