export const bugBriefSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/bug-brief.schema.json",
  title: "ForgeWeaveBugBrief",
  type: "object",
  required: ["schemaVersion", "kind", "title", "description", "targetFiles", "acceptanceCriteria"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "bug-brief" },
    title: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    targetFiles: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    acceptanceCriteria: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 }
  }
} as const;

export const patchPlanSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/patch-plan.schema.json",
  title: "ForgeWeavePatchPlan",
  type: "object",
  required: ["schemaVersion", "kind", "goal", "targetFiles", "steps", "risks"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "patch-plan" },
    goal: { type: "string", minLength: 1 },
    targetFiles: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    steps: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    risks: { type: "array", items: { type: "string", minLength: 1 } }
  }
} as const;

export const fileChangeSetSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/file-change-set.schema.json",
  title: "ForgeWeaveFileChangeSet",
  type: "object",
  required: ["schemaVersion", "kind", "changedFiles", "unifiedDiff"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "file-change-set" },
    changedFiles: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["path", "operation", "hunks", "rationale", "risk"],
        additionalProperties: false,
        properties: {
          path: { type: "string", minLength: 1 },
          operation: { type: "string", enum: ["create", "modify", "delete"] },
          beforeHash: { type: "string", minLength: 1 },
          afterHash: { type: "string", minLength: 1 },
          rationale: { type: "string", minLength: 1 },
          risk: { type: "string", minLength: 1 },
          hunks: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["oldStart", "oldLines", "newStart", "newLines", "summary"],
              additionalProperties: false,
              properties: {
                oldStart: { type: "number" },
                oldLines: { type: "number" },
                newStart: { type: "number" },
                newLines: { type: "number" },
                summary: { type: "string", minLength: 1 }
              }
            }
          }
        }
      }
    },
    unifiedDiff: { type: "string", minLength: 1 }
  }
} as const;

export const commandSummarySchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/command-summary.schema.json",
  title: "ForgeWeaveCommandSummary",
  type: "object",
  required: ["schemaVersion", "kind", "overallStatus", "commands"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "command-summary" },
    overallStatus: { type: "string", enum: ["passed", "failed", "blocked", "skipped"] },
    commands: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "status", "durationMs"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          command: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["passed", "failed", "blocked", "skipped", "timed-out"] },
          exitCode: { type: ["number", "null"] },
          durationMs: { type: "number" },
          stdoutPreview: { type: "string" },
          stderrPreview: { type: "string" },
          reason: { type: "string", minLength: 1 }
        }
      }
    }
  }
} as const;

export type BugBrief = {
  schemaVersion: "1.0.0";
  kind: "bug-brief";
  title: string;
  description: string;
  targetFiles: string[];
  acceptanceCriteria: string[];
};

export type PatchPlan = {
  schemaVersion: "1.0.0";
  kind: "patch-plan";
  goal: string;
  targetFiles: string[];
  steps: string[];
  risks: string[];
};

export type FileChangeOperation = "create" | "modify" | "delete";

export type FileChangeHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  summary: string;
};

export type FileChange = {
  path: string;
  operation: FileChangeOperation;
  beforeHash?: string;
  afterHash?: string;
  rationale: string;
  risk: string;
  hunks: FileChangeHunk[];
};

export type FileChangeSet = {
  schemaVersion: "1.0.0";
  kind: "file-change-set";
  changedFiles: FileChange[];
  unifiedDiff: string;
};

export type CommandStatus = "passed" | "failed" | "blocked" | "skipped" | "timed-out";

export type CommandRunRecord = {
  name: string;
  command?: string;
  status: CommandStatus;
  exitCode?: number | null;
  durationMs: number;
  stdoutPreview?: string;
  stderrPreview?: string;
  reason?: string;
};

export type CommandSummary = {
  schemaVersion: "1.0.0";
  kind: "command-summary";
  overallStatus: "passed" | "failed" | "blocked" | "skipped";
  commands: CommandRunRecord[];
};

export type Phase3ValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown, minItems = 0): value is string[] {
  return Array.isArray(value) && value.length >= minItems && value.every(isNonEmptyString);
}

function validateBriefLike(value: unknown, kind: string): Phase3ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: [`${kind} must be an object`] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== kind) errors.push(`kind must be ${kind}`);
  for (const key of ["title", "description"]) {
    if (!isNonEmptyString(value[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (!isStringArray(value.targetFiles, 1)) errors.push("targetFiles must be a non-empty string array");
  if (!isStringArray(value.acceptanceCriteria, 1)) {
    errors.push("acceptanceCriteria must be a non-empty string array");
  }
  return { valid: errors.length === 0, errors };
}

export function validateBugBrief(value: unknown): Phase3ValidationResult {
  return validateBriefLike(value, "bug-brief");
}

export function validatePatchPlan(value: unknown): Phase3ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["patch plan must be an object"] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "patch-plan") errors.push("kind must be patch-plan");
  if (!isNonEmptyString(value.goal)) errors.push("goal must be a non-empty string");
  if (!isStringArray(value.targetFiles, 1)) errors.push("targetFiles must be a non-empty string array");
  if (!isStringArray(value.steps, 1)) errors.push("steps must be a non-empty string array");
  if (!isStringArray(value.risks)) errors.push("risks must be a string array");
  return { valid: errors.length === 0, errors };
}

export function validateFileChangeSet(value: unknown): Phase3ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["file change set must be an object"] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "file-change-set") errors.push("kind must be file-change-set");
  if (!isNonEmptyString(value.unifiedDiff)) errors.push("unifiedDiff must be a non-empty string");
  if (!Array.isArray(value.changedFiles) || value.changedFiles.length === 0) {
    errors.push("changedFiles must be a non-empty array");
  } else {
    value.changedFiles.forEach((file, index) => {
      if (!isRecord(file)) {
        errors.push(`changedFiles.${index} must be an object`);
        return;
      }
      if (!isNonEmptyString(file.path)) errors.push(`changedFiles.${index}.path must be a non-empty string`);
      if (!["create", "modify", "delete"].includes(String(file.operation))) {
        errors.push(`changedFiles.${index}.operation must be create, modify, or delete`);
      }
      if (!isNonEmptyString(file.rationale)) errors.push(`changedFiles.${index}.rationale must be a non-empty string`);
      if (!isNonEmptyString(file.risk)) errors.push(`changedFiles.${index}.risk must be a non-empty string`);
      if (!Array.isArray(file.hunks) || file.hunks.length === 0) {
        errors.push(`changedFiles.${index}.hunks must be a non-empty array`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function validateCommandSummary(value: unknown): Phase3ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["command summary must be an object"] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "command-summary") errors.push("kind must be command-summary");
  if (!["passed", "failed", "blocked", "skipped"].includes(String(value.overallStatus))) {
    errors.push("overallStatus must be passed, failed, blocked, or skipped");
  }
  if (!Array.isArray(value.commands)) {
    errors.push("commands must be an array");
  } else {
    value.commands.forEach((command, index) => {
      if (!isRecord(command)) {
        errors.push(`commands.${index} must be an object`);
        return;
      }
      if (!isNonEmptyString(command.name)) errors.push(`commands.${index}.name must be a non-empty string`);
      if (!["passed", "failed", "blocked", "skipped", "timed-out"].includes(String(command.status))) {
        errors.push(`commands.${index}.status must be a known command status`);
      }
      if (typeof command.durationMs !== "number") errors.push(`commands.${index}.durationMs must be a number`);
    });
  }
  return { valid: errors.length === 0, errors };
}

export function isBugBrief(value: unknown): value is BugBrief {
  return validateBugBrief(value).valid;
}

export function isPatchPlan(value: unknown): value is PatchPlan {
  return validatePatchPlan(value).valid;
}

export function isFileChangeSet(value: unknown): value is FileChangeSet {
  return validateFileChangeSet(value).valid;
}

export function isCommandSummary(value: unknown): value is CommandSummary {
  return validateCommandSummary(value).valid;
}
