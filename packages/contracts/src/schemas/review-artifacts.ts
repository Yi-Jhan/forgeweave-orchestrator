export const reviewFindingsSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/review-findings.schema.json",
  title: "ForgeWeaveReviewFindings",
  type: "object",
  required: ["schemaVersion", "kind", "summary", "findings", "risks", "nextActions"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "review-findings" },
    summary: { type: "string", minLength: 1 },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "severity", "title", "detail"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          severity: { type: "string", enum: ["info", "low", "medium", "high"] },
          title: { type: "string", minLength: 1 },
          detail: { type: "string", minLength: 1 },
          file: { type: "string", minLength: 1 }
        }
      }
    },
    risks: { type: "array", items: { type: "string", minLength: 1 } },
    nextActions: { type: "array", items: { type: "string", minLength: 1 } }
  }
} as const;

export const deliverySummarySchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/delivery-summary.schema.json",
  title: "ForgeWeaveDeliverySummary",
  type: "object",
  required: ["schemaVersion", "kind", "runId", "status", "artifacts", "summary", "reviewDecision"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "delivery-summary" },
    runId: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["completed", "waiting-review", "rejected", "failed"] },
    artifacts: { type: "array", items: { type: "string", minLength: 1 } },
    summary: { type: "string", minLength: 1 },
    reviewDecision: {
      type: "object",
      required: ["status"],
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ["pending", "approved", "rejected"] },
        reason: { type: "string", minLength: 1 }
      }
    }
  }
} as const;

export type ReviewSeverity = "info" | "low" | "medium" | "high";

export type ReviewFinding = {
  id: string;
  severity: ReviewSeverity;
  title: string;
  detail: string;
  file?: string;
};

export type ReviewFindings = {
  schemaVersion: "1.0.0";
  kind: "review-findings";
  summary: string;
  findings: ReviewFinding[];
  risks: string[];
  nextActions: string[];
};

export type DeliverySummary = {
  schemaVersion: "1.0.0";
  kind: "delivery-summary";
  runId: string;
  status: "completed" | "waiting-review" | "rejected" | "failed";
  artifacts: string[];
  summary: string;
  reviewDecision: {
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
};

export type ReviewArtifactValidationResult = {
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

export function validateReviewFindings(value: unknown): ReviewArtifactValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["review findings must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "review-findings") errors.push("kind must be review-findings");
  if (!isNonEmptyString(value.summary)) errors.push("summary must be a non-empty string");
  if (!isStringArray(value.risks)) errors.push("risks must be a string array");
  if (!isStringArray(value.nextActions)) errors.push("nextActions must be a string array");
  if (!Array.isArray(value.findings)) {
    errors.push("findings must be an array");
  } else {
    value.findings.forEach((finding, index) => {
      if (!isRecord(finding)) {
        errors.push(`findings.${index} must be an object`);
        return;
      }
      for (const key of ["id", "title", "detail"]) {
        if (!isNonEmptyString(finding[key])) errors.push(`findings.${index}.${key} must be a non-empty string`);
      }
      if (!["info", "low", "medium", "high"].includes(String(finding.severity))) {
        errors.push(`findings.${index}.severity must be info, low, medium, or high`);
      }
      if (finding.file !== undefined && !isNonEmptyString(finding.file)) {
        errors.push(`findings.${index}.file must be a non-empty string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateDeliverySummary(value: unknown): ReviewArtifactValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["delivery summary must be an object"] };
  }

  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "delivery-summary") errors.push("kind must be delivery-summary");
  if (!isNonEmptyString(value.runId)) errors.push("runId must be a non-empty string");
  if (!["completed", "waiting-review", "rejected", "failed"].includes(String(value.status))) {
    errors.push("status must be completed, waiting-review, rejected, or failed");
  }
  if (!isStringArray(value.artifacts)) errors.push("artifacts must be a string array");
  if (!isNonEmptyString(value.summary)) errors.push("summary must be a non-empty string");

  const reviewDecision = value.reviewDecision;
  if (!isRecord(reviewDecision)) {
    errors.push("reviewDecision must be an object");
  } else {
    if (!["pending", "approved", "rejected"].includes(String(reviewDecision.status))) {
      errors.push("reviewDecision.status must be pending, approved, or rejected");
    }
    if (reviewDecision.reason !== undefined && !isNonEmptyString(reviewDecision.reason)) {
      errors.push("reviewDecision.reason must be a non-empty string");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isReviewFindings(value: unknown): value is ReviewFindings {
  return validateReviewFindings(value).valid;
}

export function isDeliverySummary(value: unknown): value is DeliverySummary {
  return validateDeliverySummary(value).valid;
}
