export const workflowDefinitionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/workflow-definition.schema.json",
  title: "ForgeWeaveWorkflowDefinition",
  type: "object",
  required: ["schemaVersion", "kind", "id", "title", "version", "steps", "reviewPolicy", "runtimePolicy"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "workflow-definition" },
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    inputs: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
    outputs: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "kind", "title"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { type: "string", enum: ["system", "agent", "human-review"] },
          title: { type: "string", minLength: 1 },
          dependsOn: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
          inputs: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
          outputs: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
          runtime: { type: "string", minLength: 1 },
          readOnly: { type: "boolean" }
        }
      }
    },
    reviewPolicy: {
      type: "object",
      required: ["required", "decisions"],
      additionalProperties: false,
      properties: {
        required: { type: "boolean" },
        decisions: {
          type: "array",
          items: { type: "string", enum: ["approve", "reject"] },
          uniqueItems: true
        }
      }
    },
    runtimePolicy: {
      type: "object",
      required: ["defaultProvider", "workspaceWrite"],
      additionalProperties: false,
      properties: {
        defaultProvider: { type: "string", minLength: 1 },
        workspaceWrite: { type: "string", enum: ["disallowed", "controlled"] }
      }
    }
  }
} as const;

export type WorkflowStepKind = "system" | "agent" | "human-review";

export type WorkflowStepDefinition = {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  dependsOn?: string[];
  inputs?: string[];
  outputs?: string[];
  runtime?: string;
  readOnly?: boolean;
};

export type WorkflowDefinition = {
  schemaVersion: "1.0.0";
  kind: "workflow-definition";
  id: string;
  title: string;
  version: string;
  inputs?: string[];
  outputs?: string[];
  steps: WorkflowStepDefinition[];
  reviewPolicy: {
    required: boolean;
    decisions: ("approve" | "reject")[];
  };
  runtimePolicy: {
    defaultProvider: string;
    workspaceWrite: "disallowed" | "controlled";
  };
};

export type WorkflowDefinitionValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(isNonEmptyString));
}

export function validateWorkflowDefinition(value: unknown): WorkflowDefinitionValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["workflow definition must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "workflow-definition") errors.push("kind must be workflow-definition");
  for (const key of ["id", "title", "version"]) {
    if (!isNonEmptyString(value[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (!isStringArray(value.inputs)) errors.push("inputs must be a string array");
  if (!isStringArray(value.outputs)) errors.push("outputs must be a string array");

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    errors.push("steps must be a non-empty array");
  } else {
    const stepIds = new Set<string>();
    value.steps.forEach((step, index) => {
      if (!isRecord(step)) {
        errors.push(`steps.${index} must be an object`);
        return;
      }
      if (!isNonEmptyString(step.id)) {
        errors.push(`steps.${index}.id must be a non-empty string`);
      } else if (stepIds.has(step.id)) {
        errors.push(`steps.${index}.id must be unique`);
      } else {
        stepIds.add(step.id);
      }
      if (!["system", "agent", "human-review"].includes(String(step.kind))) {
        errors.push(`steps.${index}.kind must be system, agent, or human-review`);
      }
      if (!isNonEmptyString(step.title)) errors.push(`steps.${index}.title must be a non-empty string`);
      if (!isStringArray(step.dependsOn)) errors.push(`steps.${index}.dependsOn must be a string array`);
      if (!isStringArray(step.inputs)) errors.push(`steps.${index}.inputs must be a string array`);
      if (!isStringArray(step.outputs)) errors.push(`steps.${index}.outputs must be a string array`);
      if (step.runtime !== undefined && !isNonEmptyString(step.runtime)) {
        errors.push(`steps.${index}.runtime must be a non-empty string`);
      }
      if (step.readOnly !== undefined && typeof step.readOnly !== "boolean") {
        errors.push(`steps.${index}.readOnly must be a boolean`);
      }
    });
  }

  const reviewPolicy = value.reviewPolicy;
  if (!isRecord(reviewPolicy)) {
    errors.push("reviewPolicy must be an object");
  } else {
    if (typeof reviewPolicy.required !== "boolean") errors.push("reviewPolicy.required must be a boolean");
    if (
      !Array.isArray(reviewPolicy.decisions) ||
      reviewPolicy.decisions.length === 0 ||
      reviewPolicy.decisions.some((decision) => !["approve", "reject"].includes(String(decision)))
    ) {
      errors.push("reviewPolicy.decisions must contain approve/reject decisions");
    }
  }

  const runtimePolicy = value.runtimePolicy;
  if (!isRecord(runtimePolicy)) {
    errors.push("runtimePolicy must be an object");
  } else {
    if (!isNonEmptyString(runtimePolicy.defaultProvider)) {
      errors.push("runtimePolicy.defaultProvider must be a non-empty string");
    }
    if (!["disallowed", "controlled"].includes(String(runtimePolicy.workspaceWrite))) {
      errors.push("runtimePolicy.workspaceWrite must be disallowed or controlled");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  return validateWorkflowDefinition(value).valid;
}
