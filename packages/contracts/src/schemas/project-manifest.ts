export const projectManifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/project-manifest.schema.json",
  title: "ForgeWeaveProjectManifest",
  type: "object",
  required: ["schemaVersion", "kind", "project", "validation", "commands", "workflows", "policies"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "project-manifest" },
    project: {
      type: "object",
      required: ["id", "name", "type", "framework", "language"],
      additionalProperties: false,
      properties: {
        id: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        type: { type: "string", minLength: 1 },
        framework: { type: "string", minLength: 1 },
        language: { type: "string", minLength: 1 }
      }
    },
    validation: {
      type: "object",
      required: ["mode", "realProjectRootEnv"],
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["fixture", "live-readonly", "live-patch"] },
        realProjectRootEnv: { type: "string", minLength: 1 }
      }
    },
    commands: {
      type: "object",
      required: [],
      additionalProperties: { type: "string", minLength: 1 },
      properties: {
        install: { type: "string", minLength: 1 },
        lint: { type: "string", minLength: 1 },
        test: { type: "string", minLength: 1 },
        build: { type: "string", minLength: 1 }
      }
    },
    workflows: {
      type: "object",
      required: ["enabled"],
      additionalProperties: false,
      properties: {
        enabled: {
          type: "array",
          items: { type: "string", minLength: 1 },
          uniqueItems: true
        }
      }
    },
    policies: {
      type: "object",
      required: ["externalNetworkDefault", "humanReviewRequiredFor"],
      additionalProperties: false,
      properties: {
        externalNetworkDefault: { type: "string", enum: ["blocked", "allowed"] },
        humanReviewRequiredFor: {
          type: "array",
          items: { type: "string", minLength: 1 },
          uniqueItems: true
        }
      }
    }
  }
} as const;

export type ValidationMode = "fixture" | "live-readonly" | "live-patch";

export type ProjectManifest = {
  schemaVersion: "1.0.0";
  kind: "project-manifest";
  project: {
    id: string;
    name: string;
    type: string;
    framework: string;
    language: string;
  };
  validation: {
    mode: ValidationMode;
    realProjectRootEnv: string;
  };
  commands: Record<string, string>;
  workflows: {
    enabled: string[];
  };
  policies: {
    externalNetworkDefault: "blocked" | "allowed";
    humanReviewRequiredFor: string[];
  };
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

export function validateProjectManifest(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["manifest must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "project-manifest") errors.push("kind must be project-manifest");

  const project = value.project;
  if (!isRecord(project)) {
    errors.push("project must be an object");
  } else {
    for (const key of ["id", "name", "type", "framework", "language"]) {
      if (!isNonEmptyString(project[key])) errors.push(`project.${key} must be a non-empty string`);
    }
  }

  const validation = value.validation;
  if (!isRecord(validation)) {
    errors.push("validation must be an object");
  } else {
    if (!["fixture", "live-readonly", "live-patch"].includes(String(validation.mode))) {
      errors.push("validation.mode must be fixture, live-readonly, or live-patch");
    }
    if (!isNonEmptyString(validation.realProjectRootEnv)) {
      errors.push("validation.realProjectRootEnv must be a non-empty string");
    }
  }

  const commands = value.commands;
  if (!isRecord(commands)) {
    errors.push("commands must be an object");
  } else {
    for (const [name, command] of Object.entries(commands)) {
      if (!isNonEmptyString(command)) errors.push(`commands.${name} must be a non-empty string`);
    }
  }

  const workflows = value.workflows;
  if (!isRecord(workflows) || !isStringArray(workflows.enabled)) {
    errors.push("workflows.enabled must be a string array");
  }

  const policies = value.policies;
  if (!isRecord(policies)) {
    errors.push("policies must be an object");
  } else {
    if (!["blocked", "allowed"].includes(String(policies.externalNetworkDefault))) {
      errors.push("policies.externalNetworkDefault must be blocked or allowed");
    }
    if (!isStringArray(policies.humanReviewRequiredFor)) {
      errors.push("policies.humanReviewRequiredFor must be a string array");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isProjectManifest(value: unknown): value is ProjectManifest {
  return validateProjectManifest(value).valid;
}
