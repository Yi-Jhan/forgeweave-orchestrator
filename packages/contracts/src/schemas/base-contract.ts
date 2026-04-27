export const baseContractSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://forgeweave.dev/schemas/base-contract-placeholder.schema.json",
  title: "ForgeWeaveBaseContractPlaceholder",
  type: "object",
  required: ["schemaVersion", "kind"],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: "string",
      const: "0.0.0"
    },
    kind: {
      type: "string",
      const: "placeholder"
    }
  }
} as const;

export type BaseContractPlaceholder = {
  schemaVersion: "0.0.0";
  kind: "placeholder";
};

export function isBaseContractPlaceholder(
  value: unknown
): value is BaseContractPlaceholder {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.schemaVersion === "0.0.0" && candidate.kind === "placeholder";
}
