import { spawn } from "child_process";

import type { CodexRunLog, CodexValidationResult } from "./codex-runner";

export type CodexCliExecutionResult = {
  exitCode: number;
  logs: CodexRunLog[];
  validation: CodexValidationResult;
};

const defaultTimeoutMs = 10 * 60 * 1000;

export function parseCodexArgs(rawArgs: string | undefined) {
  if (!rawArgs?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawArgs) as unknown;

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    return rawArgs.split(" ").map((part) => part.trim()).filter(Boolean);
  }

  return [];
}

export function getCodexCommandConfig() {
  return {
    command: process.env.CODEX_COMMAND?.trim() || "codex",
    args: parseCodexArgs(process.env.CODEX_ARGS_JSON),
    timeoutMs: Number(process.env.CODEX_TIMEOUT_MS || defaultTimeoutMs)
  };
}

export async function executeCodexCli({
  cwd,
  prompt,
  startedAt
}: {
  cwd: string;
  prompt: string;
  startedAt: string;
}): Promise<CodexCliExecutionResult> {
  const config = getCodexCommandConfig();
  const commandLabel = [config.command, ...config.args].join(" ");
  const logs: CodexRunLog[] = [
    log("system", "info", `Codex CLI 실행 명령: ${commandLabel}`, 1, startedAt),
    log("system", "info", `실행 cwd: ${cwd}`, 2, startedAt)
  ];

  return new Promise((resolve) => {
    const child = spawn(config.command, config.args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let sequence = logs.length + 1;
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      child.kill();
      const finishedAt = new Date().toISOString();
      logs.push(log("system", "error", `Codex CLI 실행이 ${config.timeoutMs}ms 제한을 초과해 중단되었습니다.`, sequence++, finishedAt));
      settled = true;
      resolve({
        exitCode: 124,
        logs,
        validation: {
          type: "codex",
          command: commandLabel,
          status: "failed",
          exitCode: 124,
          outputSummary: "Codex CLI 실행 시간이 제한을 초과했습니다."
        }
      });
    }, config.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const content = chunk.toString();
      stdout += content;
      logs.push(log("stdout", "info", content.trimEnd(), sequence++, new Date().toISOString()));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const content = chunk.toString();
      stderr += content;
      logs.push(log("stderr", "warn", content.trimEnd(), sequence++, new Date().toISOString()));
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      clearTimeout(timeout);
      settled = true;
      logs.push(log("system", "error", error.message, sequence++, new Date().toISOString()));
      resolve({
        exitCode: 1,
        logs,
        validation: {
          type: "codex",
          command: commandLabel,
          status: "failed",
          exitCode: 1,
          outputSummary: error.message
        }
      });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      clearTimeout(timeout);
      settled = true;
      const exitCode = code ?? 1;
      const outputSummary = summarizeOutput(stdout, stderr);
      logs.push(log("system", exitCode === 0 ? "success" : "error", `Codex CLI 종료 코드: ${exitCode}`, sequence++, new Date().toISOString()));
      resolve({
        exitCode,
        logs,
        validation: {
          type: "codex",
          command: commandLabel,
          status: exitCode === 0 ? "passed" : "failed",
          exitCode,
          outputSummary
        }
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function summarizeOutput(stdout: string, stderr: string) {
  const combined = `${stdout}\n${stderr}`.replace(/\s+/g, " ").trim();

  if (!combined) {
    return "Codex CLI 출력이 없습니다.";
  }

  return combined.length > 240 ? `${combined.slice(0, 237)}...` : combined;
}

function log(stream: CodexRunLog["stream"], level: CodexRunLog["level"], content: string, sequence: number, createdAt: string): CodexRunLog {
  return {
    stream,
    level,
    content,
    sequence,
    createdAt
  };
}
