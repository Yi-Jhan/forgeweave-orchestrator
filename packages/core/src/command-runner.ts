import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import type { CommandRunRecord, CommandSummary, ProjectManifest } from "@forgeweave/contracts";

export type ValidationCommandName = "lint" | "test" | "build";

export type CommandAllowlistDecision = {
  allowed: boolean;
  command?: string;
  reason?: string;
};

export type RunCommandOptions = {
  manifest: ProjectManifest;
  commandName: string;
  cwd: string;
  timeoutMs?: number;
};

const validationCommandNames: ValidationCommandName[] = ["lint", "test", "build"];

function preview(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined;
  return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
}

export function evaluateCommandAllowlist(manifest: ProjectManifest, commandName: string): CommandAllowlistDecision {
  if (!validationCommandNames.includes(commandName as ValidationCommandName)) {
    return {
      allowed: false,
      reason: `Command is not in the Phase 3 validation allowlist: ${commandName}`
    };
  }

  const command = manifest.commands[commandName];
  if (command === undefined || command.trim().length === 0) {
    return {
      allowed: true,
      reason: `Manifest does not define command: ${commandName}`
    };
  }

  return {
    allowed: true,
    command
  };
}

export function runAllowedCommand(options: RunCommandOptions): CommandRunRecord {
  const startedAt = Date.now();
  const cwd = resolve(options.cwd);
  const decision = evaluateCommandAllowlist(options.manifest, options.commandName);
  const duration = () => Date.now() - startedAt;

  if (!decision.allowed) {
    return {
      name: options.commandName,
      status: "blocked",
      durationMs: duration(),
      reason: decision.reason
    };
  }

  if (decision.command === undefined) {
    return {
      name: options.commandName,
      status: "skipped",
      durationMs: duration(),
      reason: decision.reason
    };
  }

  if (!existsSync(join(cwd, "package.json"))) {
    return {
      name: options.commandName,
      command: decision.command,
      status: "skipped",
      durationMs: duration(),
      reason: "package.json not found in controlled workdir; fixture command skipped."
    };
  }

  const result = spawnSync(decision.command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 30_000
  });

  if (result.error !== undefined && "code" in result.error && result.error.code === "ETIMEDOUT") {
    return {
      name: options.commandName,
      command: decision.command,
      status: "timed-out",
      exitCode: null,
      durationMs: duration(),
      stdoutPreview: preview(result.stdout),
      stderrPreview: preview(result.stderr),
      reason: "Command timed out."
    };
  }

  const exitCode = result.status ?? (result.error === undefined ? 0 : 1);
  return {
    name: options.commandName,
    command: decision.command,
    status: exitCode === 0 ? "passed" : "failed",
    exitCode,
    durationMs: duration(),
    stdoutPreview: preview(result.stdout),
    stderrPreview: preview(result.stderr),
    reason: result.error?.message
  };
}

function summarizeOverall(commands: CommandRunRecord[]): CommandSummary["overallStatus"] {
  if (commands.some((command) => command.status === "blocked")) return "blocked";
  if (commands.some((command) => command.status === "failed" || command.status === "timed-out")) return "failed";
  if (commands.length === 0 || commands.every((command) => command.status === "skipped")) return "skipped";
  return "passed";
}

export function runValidationCommandSummary(input: {
  manifest: ProjectManifest;
  cwd: string;
  commands?: string[];
  timeoutMs?: number;
}): CommandSummary {
  const commands = (input.commands ?? validationCommandNames).map((commandName) =>
    runAllowedCommand({
      manifest: input.manifest,
      commandName,
      cwd: input.cwd,
      timeoutMs: input.timeoutMs
    })
  );

  return {
    schemaVersion: "1.0.0",
    kind: "command-summary",
    overallStatus: summarizeOverall(commands),
    commands
  };
}
