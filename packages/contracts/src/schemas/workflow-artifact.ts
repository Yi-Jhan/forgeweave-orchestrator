export const workflowArtifactSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/workflow-artifact.schema.json",
  title: "ForgeWeaveWorkflowArtifact",
  type: "object",
  required: ["schemaVersion", "kind", "artifactId", "runId", "status", "producedBy", "refs", "payload", "createdAt"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", minLength: 1 },
    artifactId: { type: "string", minLength: 1 },
    runId: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["created", "ready", "failed"] },
    producedBy: {
      type: "object",
      required: ["stepId"],
      additionalProperties: false,
      properties: {
        stepId: { type: "string", minLength: 1 },
        provider: { type: "string", minLength: 1 }
      }
    },
    refs: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "uri"],
        additionalProperties: false,
        properties: {
          label: { type: "string", minLength: 1 },
          uri: { type: "string", minLength: 1 }
        }
      }
    },
    payload: { type: "object" },
    createdAt: { type: "string", minLength: 1 }
  }
} as const;

export type ArtifactStatus = "created" | "ready" | "failed";

export type ArtifactRef = {
  label: string;
  uri: string;
};

export type WorkflowArtifact<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  schemaVersion: "1.0.0";
  kind: string;
  artifactId: string;
  runId: string;
  status: ArtifactStatus;
  producedBy: {
    stepId: string;
    provider?: string;
  };
  refs: ArtifactRef[];
  payload: TPayload;
  createdAt: string;
};

export type WorkflowArtifactValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateWorkflowArtifact(value: unknown): WorkflowArtifactValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["artifact must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  for (const key of ["kind", "artifactId", "runId", "createdAt"]) {
    if (!isNonEmptyString(value[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (!["created", "ready", "failed"].includes(String(value.status))) {
    errors.push("status must be created, ready, or failed");
  }

  const producedBy = value.producedBy;
  if (!isRecord(producedBy) || !isNonEmptyString(producedBy.stepId)) {
    errors.push("producedBy.stepId must be a non-empty string");
  }
  if (isRecord(producedBy) && producedBy.provider !== undefined && !isNonEmptyString(producedBy.provider)) {
    errors.push("producedBy.provider must be a non-empty string");
  }

  if (!Array.isArray(value.refs)) {
    errors.push("refs must be an array");
  } else {
    value.refs.forEach((ref, index) => {
      if (!isRecord(ref) || !isNonEmptyString(ref.label) || !isNonEmptyString(ref.uri)) {
        errors.push(`refs.${index} must include label and uri`);
      }
    });
  }
  if (!isRecord(value.payload)) errors.push("payload must be an object");

  return { valid: errors.length === 0, errors };
}

export function isWorkflowArtifact(value: unknown): value is WorkflowArtifact {
  return validateWorkflowArtifact(value).valid;
}
