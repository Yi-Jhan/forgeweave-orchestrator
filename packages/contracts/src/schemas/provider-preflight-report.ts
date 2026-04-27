export const providerPreflightReportSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/provider-preflight-report.schema.json",
  title: "ForgeWeaveProviderPreflightReport",
  type: "object",
  required: ["schemaVersion", "kind", "provider", "status", "capabilities", "missingFeatures", "degradedModes"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "provider-preflight-report" },
    provider: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["pass", "degraded", "fail"] },
    capabilities: {
      type: "object",
      additionalProperties: { type: "string", enum: ["supported", "partial", "unsupported"] }
    },
    missingFeatures: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    degradedModes: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  }
} as const;

export type ProviderPreflightStatus = "pass" | "degraded" | "fail";
export type ProviderCapabilitySupport = "supported" | "partial" | "unsupported";

export type ProviderPreflightReport = {
  schemaVersion: "1.0.0";
  kind: "provider-preflight-report";
  provider: string;
  status: ProviderPreflightStatus;
  capabilities: Record<string, ProviderCapabilitySupport>;
  missingFeatures: string[];
  degradedModes: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProviderPreflightReport(value: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) return { valid: false, errors: ["report must be an object"] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "provider-preflight-report") errors.push("kind must be provider-preflight-report");
  if (typeof value.provider !== "string" || value.provider.length === 0) {
    errors.push("provider must be a non-empty string");
  }
  if (!["pass", "degraded", "fail"].includes(String(value.status))) {
    errors.push("status must be pass, degraded, or fail");
  }
  if (!isRecord(value.capabilities)) {
    errors.push("capabilities must be an object");
  } else {
    for (const [name, support] of Object.entries(value.capabilities)) {
      if (!["supported", "partial", "unsupported"].includes(String(support))) {
        errors.push(`capabilities.${name} must be supported, partial, or unsupported`);
      }
    }
  }
  if (!Array.isArray(value.missingFeatures) || !value.missingFeatures.every((item) => typeof item === "string")) {
    errors.push("missingFeatures must be a string array");
  }
  if (!Array.isArray(value.degradedModes) || !value.degradedModes.every((item) => typeof item === "string")) {
    errors.push("degradedModes must be a string array");
  }

  return { valid: errors.length === 0, errors };
}

export function isProviderPreflightReport(value: unknown): value is ProviderPreflightReport {
  return validateProviderPreflightReport(value).valid;
}
