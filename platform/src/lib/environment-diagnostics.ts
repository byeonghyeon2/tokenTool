import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

import { getCodexCommandConfig } from "./codex-cli-executor";
import { getProjectsRoot } from "./project-scanner";

const execFileAsync = promisify(execFile);
const nodePath = "C:\\Program Files\\nodejs";

export type DiagnosticCheck = {
  name: string;
  command: string;
  ok: boolean;
  output: string;
  error?: string;
};

export type EnvironmentDiagnostics = {
  generatedAt: string;
  cwd: string;
  projectsRoot: string;
  nodePathExists: boolean;
  env: {
    codeProvider: string;
    codexCommand: string;
    codexArgsJson: string;
    codexCliEnabled: boolean;
    codexTimeoutMs: string;
    databaseUrlConfigured: boolean;
  };
  checks: DiagnosticCheck[];
};

export async function getEnvironmentDiagnostics(): Promise<EnvironmentDiagnostics> {
  const codexConfig = getCodexCommandConfig();
  const checks = await Promise.all([
    runCheck("Node.js", nodeExecutable(), ["--version"]),
    runCheck("npm", npmExecutable(), ["--version"]),
    runCheck("Git", "git", ["--version"]),
    runCheck("MySQL CLI", "mysql", ["--version"]),
    runCheck("Codex CLI", codexConfig.command, ["--version"])
  ]);

  return {
    generatedAt: new Date().toISOString(),
    cwd: process.cwd(),
    projectsRoot: getProjectsRoot(),
    nodePathExists: existsSync(nodePath),
    env: {
      codeProvider: process.env.CODEX_PROVIDER || "mock",
      codexCommand: codexConfig.command,
      codexArgsJson: process.env.CODEX_ARGS_JSON || "[]",
      codexCliEnabled: process.env.CODEX_CLI_ENABLED === "true",
      codexTimeoutMs: String(codexConfig.timeoutMs),
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL)
    },
    checks
  };
}

async function runCheck(name: string, command: string, args: string[]): Promise<DiagnosticCheck> {
  const commandLabel = [command, ...args].join(" ");

  try {
    const result = await execFileAsync(command, args, {
      timeout: 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        Path: ensureNodePath(process.env.Path ?? process.env.PATH ?? "")
      }
    });

    return {
      name,
      command: commandLabel,
      ok: true,
      output: sanitizeOutput(result.stdout || result.stderr)
    };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };

    return {
      name,
      command: commandLabel,
      ok: false,
      output: sanitizeOutput(failure.stdout || failure.stderr || ""),
      error: failure.message
    };
  }
}

function nodeExecutable() {
  const windowsNode = path.join(nodePath, "node.exe");
  return process.platform === "win32" && existsSync(windowsNode) ? windowsNode : "node";
}

function npmExecutable() {
  const windowsNpm = path.join(nodePath, "npm.cmd");
  return process.platform === "win32" && existsSync(windowsNpm) ? windowsNpm : "npm";
}

function ensureNodePath(currentPath: string) {
  if (process.platform !== "win32") {
    return currentPath;
  }

  return currentPath.includes(nodePath) ? currentPath : `${nodePath};${currentPath}`;
}

function sanitizeOutput(output: string) {
  return output.replace(/\s+/g, " ").trim().slice(0, 500);
}
