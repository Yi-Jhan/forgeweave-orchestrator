import { describe, expect, it } from "vitest";

import {
  baseContractSchema,
  isBaseContractPlaceholder
} from "./base-contract.js";

describe("base contract placeholder schema", () => {
  it("exports the placeholder schema identity", () => {
    expect(baseContractSchema.$id).toContain("base-contract-placeholder");
  });

  it("validates the placeholder shape", () => {
    expect(
      isBaseContractPlaceholder({
        schemaVersion: "0.0.0",
        kind: "placeholder"
      })
    ).toBe(true);

    expect(isBaseContractPlaceholder({ schemaVersion: "0.0.0" })).toBe(false);
  });
});
