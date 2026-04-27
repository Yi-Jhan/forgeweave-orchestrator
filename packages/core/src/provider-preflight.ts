import type { ProviderPreflightReport } from "@forgeweave/contracts";

export type ProviderCapabilityMatrix = {
  schemaVersion: "1.0.0";
  kind: "provider-capability-matrix";
  providers: Array<{
    provider: string;
    capabilities: ProviderPreflightReport["capabilities"];
    status: ProviderPreflightReport["status"];
  }>;
};

export function runMockProviderPreflight(provider: "mock-pass" | "mock-degraded" | "mock-fail"): ProviderPreflightReport {
  if (provider === "mock-pass") {
    return {
      schemaVersion: "1.0.0",
      kind: "provider-preflight-report",
      provider,
      status: "pass",
      capabilities: {
        streaming: "supported",
        session: "supported",
        hooks: "supported",
        skills: "supported",
        "tool-events": "supported"
      },
      missingFeatures: [],
      degradedModes: []
    };
  }

  if (provider === "mock-fail") {
    return {
      schemaVersion: "1.0.0",
      kind: "provider-preflight-report",
      provider,
      status: "fail",
      capabilities: {
        streaming: "unsupported",
        session: "unsupported",
        hooks: "unsupported",
        skills: "unsupported",
        "tool-events": "unsupported"
      },
      missingFeatures: ["streaming", "session", "hooks", "skills", "tool-events"],
      degradedModes: ["provider unavailable"]
    };
  }

  return {
    schemaVersion: "1.0.0",
    kind: "provider-preflight-report",
    provider,
    status: "degraded",
    capabilities: {
      streaming: "supported",
      session: "supported",
      hooks: "partial",
      skills: "partial",
      "tool-events": "unsupported"
    },
    missingFeatures: ["tool-events"],
    degradedModes: ["hooks require polling", "skills resolved from local assets only"]
  };
}

export function buildProviderCapabilityMatrix(reports: ProviderPreflightReport[]): ProviderCapabilityMatrix {
  return {
    schemaVersion: "1.0.0",
    kind: "provider-capability-matrix",
    providers: reports.map((report) => ({
      provider: report.provider,
      capabilities: report.capabilities,
      status: report.status
    }))
  };
}
