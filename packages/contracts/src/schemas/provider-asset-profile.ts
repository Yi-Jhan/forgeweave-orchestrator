export const providerAssetProfileSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/provider-asset-profile.schema.json",
  title: "ForgeWeaveProviderAssetProfile",
  type: "object",
  required: ["schemaVersion", "kind", "provider", "assets"],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", const: "1.0.0" },
    kind: { type: "string", const: "provider-asset-profile" },
    provider: { type: "string", minLength: 1 },
    assets: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "path", "required"],
        additionalProperties: false,
        properties: {
          kind: {
            type: "string",
            enum: ["instructions", "agent", "skill", "workflow"]
          },
          path: { type: "string", minLength: 1 },
          required: { type: "boolean" }
        }
      }
    }
  }
} as const;

export type ProviderAssetKind = "instructions" | "agent" | "skill" | "workflow";

export type ProviderAssetProfile = {
  schemaVersion: "1.0.0";
  kind: "provider-asset-profile";
  provider: string;
  assets: Array<{
    kind: ProviderAssetKind;
    path: string;
    required: boolean;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProviderAssetProfile(value: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) return { valid: false, errors: ["profile must be an object"] };
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (value.kind !== "provider-asset-profile") errors.push("kind must be provider-asset-profile");
  if (typeof value.provider !== "string" || value.provider.length === 0) {
    errors.push("provider must be a non-empty string");
  }
  if (!Array.isArray(value.assets)) {
    errors.push("assets must be an array");
  } else {
    value.assets.forEach((asset, index) => {
      if (!isRecord(asset)) {
        errors.push(`assets.${index} must be an object`);
        return;
      }
      if (!["instructions", "agent", "skill", "workflow"].includes(String(asset.kind))) {
        errors.push(`assets.${index}.kind is unsupported`);
      }
      if (typeof asset.path !== "string" || asset.path.length === 0) {
        errors.push(`assets.${index}.path must be a non-empty string`);
      }
      if (typeof asset.required !== "boolean") {
        errors.push(`assets.${index}.required must be a boolean`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function isProviderAssetProfile(value: unknown): value is ProviderAssetProfile {
  return validateProviderAssetProfile(value).valid;
}
