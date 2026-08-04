import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { collectGitDiffSnapshot } from "./git-diff";
import type { CodexRunLog, CodexRunResult, CodexValidationResult } from "./codex-runner";
import { getProjectsRoot, isPathInside, scanProjectCandidate, type ScannedProject } from "./project-scanner";
import { requiresExplicitConfirmation } from "./utils";

export type ProjectCommandType = "run" | "lint" | "typecheck" | "test" | "build";
export type ProjectCommandSetType = "standard-validation";

const workspaceRoot = path.resolve(process.cwd(), "..");
const runsRoot = path.join(workspaceRoot, "workspace-data", "runs");
const commandTimeoutMs = Number(process.env.PROJECT_COMMAND_TIMEOUT_MS || 120_000);
const standardValidationCommands: ProjectCommandType[] = ["lint", "typecheck", "test", "build"];

type ResolvedProjectCommand = {
  projectName: string;
  projectPath: string;
  project: ScannedProject;
  commandType: ProjectCommandType;
  command: string;
};

export async function runProjectCommand({
  projectName,
  commandType,
  confirmation,
  expectedCommand
}: {
  projectName: string;
  commandType: ProjectCommandType;
  confirmation?: string;
  expectedCommand?: string;
}) {
  const resolved = await resolveProjectCommand(projectName, commandType);
  const gitSnapshot = await collectGitDiffSnapshot(getProjectsRoot(), resolved.projectPath);
  const preflightFailure = validateCommandPreflight({
    command: resolved.command,
    confirmation,
    expectedCommand
  });

  if (preflightFailure) {
    return saveCommandRun(
      buildBlockedCommandRun({
        ...resolved,
        reason: preflightFailure,
        gitSnapshot
      })
    );
  }

  return saveCommandRun(await executeProjectCommand({ ...resolved, gitSnapshot }));
}

export async function runProjectCommandSet({
  projectName,
  setType,
  confirmation,
  expectedCommands
}: {
  projectName: string;
  setType: ProjectCommandSetType;
  confirmation?: string;
  expectedCommands?: Partial<Record<ProjectCommandType, string>>;
}) {
  if (setType !== "standard-validation") {
    throw new Error("지원하지 않는 검증 세트입니다.");
  }

  const resolvedCommands = await Promise.all(
    standardValidationCommands.map(async (commandType) => resolveOptionalProjectCommand(projectName, commandType))
  );
  const availableCommands = resolvedCommands.filter((item): item is ResolvedProjectCommand => Boolean(item));

  if (availableCommands.length === 0) {
    throw new Error("실행할 검증 명령이 프로젝트 요약에 저장되어 있지 않습니다.");
  }

  const first = availableCommands[0];
  const gitSnapshot = await collectGitDiffSnapshot(getProjectsRoot(), first.projectPath);
  const preflightFailure = availableCommands
    .map((item) =>
      validateCommandPreflight({
        command: item.command,
        confirmation,
        expectedCommand: expectedCommands?.[item.commandType]
      })
    )
    .find(Boolean);

  if (preflightFailure) {
    return saveCommandRun(
      buildBlockedCommandRun({
        ...first,
        commandType: "build",
        command: availableCommands.map((item) => `${item.commandType}: ${item.command}`).join(" && "),
        reason: preflightFailure,
        gitSnapshot
      })
    );
  }

  return saveCommandRun(await executeProjectCommandSet({ commands: availableCommands, gitSnapshot }));
}

async function resolveProjectCommand(projectName: string, commandType: ProjectCommandType): Promise<ResolvedProjectCommand> {
  const projectsRoot = getProjectsRoot();
  const projectPath = path.resolve(projectsRoot, projectName);

  if (!isPathInside(projectsRoot, projectPath)) {
    throw new Error("PROJECTS_ROOT 밖의 프로젝트 명령은 실행할 수 없습니다.");
  }

  const project = await scanProjectCandidate(projectPath);

  if (!project) {
    throw new Error("프로젝트 감지 기준 파일을 찾지 못했습니다.");
  }

  const command = getSavedCommand(project, commandType);

  if (!command) {
    throw new Error(`${commandType} 명령이 프로젝트 요약에 저장되어 있지 않습니다.`);
  }

  return {
    projectName,
    projectPath,
    project,
    commandType,
    command
  };
}

async function resolveOptionalProjectCommand(projectName: string, commandType: ProjectCommandType) {
  try {
    return await resolveProjectCommand(projectName, commandType);
  } catch (error) {
    if (error instanceof Error && error.message.includes("저장되어 있지 않습니다")) {
      return null;
    }

    throw error;
  }
}

function validateCommandPreflight({
  command,
  confirmation,
  expectedCommand
}: {
  command: string;
  confirmation?: string;
  expectedCommand?: string;
}) {
  if (expectedCommand && expectedCommand.trim() !== command) {
    return "화면에 표시된 명령과 저장된 프로젝트 요약 명령이 다릅니다. 먼저 프로젝트 요약을 저장한 뒤 다시 실행하세요.";
  }

  if (requiresExplicitConfirmation(command)) {
    return "위험 명령 패턴이 감지되어 실행을 차단했습니다.";
  }

  if (confirmation !== "RUN_PROJECT_COMMAND") {
    return "확인 문구 RUN_PROJECT_COMMAND가 없어 프로젝트 명령 실행을 차단했습니다.";
  }

  return "";
}

function getSavedCommand(project: ScannedProject, commandType: ProjectCommandType) {
  switch (commandType) {
    case "run":
      return project.runCommand;
    case "lint":
      return project.lintCommand;
    case "typecheck":
      return project.typecheckCommand;
    case "test":
      return project.testCommand;
    case "build":
      return project.buildCommand;
  }
}

async function executeProjectCommand({
  projectName,
  projectPath,
  commandType,
  command,
  gitSnapshot
}: ResolvedProjectCommand & {
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
}): Promise<CodexRunResult> {
  const startedAt = new Date().toISOString();
  const execution = await runShellCommand(projectPath, command, startedAt, 1);
  const finishedAt = new Date().toISOString();
  const validation = buildValidation(commandType, command, execution.exitCode, execution.output);

  return {
    id: randomUUID(),
    provider: "mock",
    projectName,
    projectPath,
    promptPath: "",
    status: execution.exitCode === 0 ? "completed" : "failed",
    startedAt,
    finishedAt,
    exitCode: execution.exitCode,
    summary: `${commandType} 명령 실행이 ${execution.exitCode === 0 ? "완료" : "실패"}되었습니다.`,
    logs: execution.logs,
    fileChanges: gitSnapshot.fileChanges,
    validations: [gitSnapshot.validation, validation],
    savedPath: ""
  };
}

async function executeProjectCommandSet({
  commands,
  gitSnapshot
}: {
  commands: ResolvedProjectCommand[];
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
}): Promise<CodexRunResult> {
  const startedAt = new Date().toISOString();
  const first = commands[0];
  const logs: CodexRunLog[] = [
    log("system", "info", `검증 세트 실행: ${commands.map((item) => item.commandType).join(", ")}`, 1, startedAt)
  ];
  const validations: CodexValidationResult[] = [gitSnapshot.validation];
  let nextSequence = 2;
  let finalExitCode = 0;

  for (const item of commands) {
    const execution = await runShellCommand(item.projectPath, item.command, new Date().toISOString(), nextSequence, item.commandType);
    logs.push(...execution.logs);
    validations.push(buildValidation(item.commandType, item.command, execution.exitCode, execution.output));
    nextSequence = Math.max(...logs.map((entry) => entry.sequence)) + 1;

    if (execution.exitCode !== 0) {
      finalExitCode = execution.exitCode;
      logs.push(log("system", "warn", `${item.commandType} 실패로 검증 세트 실행을 중단했습니다.`, nextSequence, new Date().toISOString()));
      break;
    }
  }

  const finishedAt = new Date().toISOString();

  return {
    id: randomUUID(),
    provider: "mock",
    projectName: first.projectName,
    projectPath: first.projectPath,
    promptPath: "",
    status: finalExitCode === 0 ? "completed" : "failed",
    startedAt,
    finishedAt,
    exitCode: finalExitCode,
    summary: finalExitCode === 0 ? "검증 세트 실행을 완료했습니다." : "검증 세트 실행 중 실패가 발생했습니다.",
    logs,
    fileChanges: gitSnapshot.fileChanges,
    validations,
    savedPath: ""
  };
}

function buildBlockedCommandRun({
  projectName,
  projectPath,
  commandType,
  command,
  reason,
  gitSnapshot
}: ResolvedProjectCommand & {
  reason: string;
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
}): CodexRunResult {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    provider: "mock",
    projectName,
    projectPath,
    promptPath: "",
    status: "blocked",
    startedAt: now,
    finishedAt: now,
    exitCode: 1,
    summary: reason,
    logs: [log("system", "warn", reason, 1, now), log("system", "info", `차단된 명령: ${command}`, 2, now)],
    fileChanges: gitSnapshot.fileChanges,
    validations: [
      gitSnapshot.validation,
      {
        type: commandType,
        command,
        status: "skipped",
        outputSummary: reason
      }
    ],
    savedPath: ""
  };
}

async function saveCommandRun(run: CodexRunResult) {
  await mkdir(runsRoot, { recursive: true });
  const savedPath = path.join(runsRoot, `codex-run-${Date.now()}.json`);
  const result = { ...run, savedPath };
  await writeFile(savedPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

function runShellCommand(cwd: string, command: string, startedAt: string, sequenceStart: number, label?: string) {
  return new Promise<{ exitCode: number; logs: CodexRunLog[]; output: string }>((resolve) => {
    const logs: CodexRunLog[] = [
      log("system", "info", `${label ? `[${label}] ` : ""}작업 경로: ${cwd}`, sequenceStart, startedAt),
      log("system", "info", `${label ? `[${label}] ` : ""}프로젝트 명령 실행: ${command}`, sequenceStart + 1, startedAt)
    ];
    const outputParts: string[] = [];
    let settled = false;
    let sequence = sequenceStart + 2;
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        Path: `C:\\Program Files\\nodejs;${process.env.Path || ""}`
      }
    });

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      logs.push(log("system", "error", `명령 시간이 ${commandTimeoutMs}ms를 초과해 중단했습니다.`, sequence++, new Date().toISOString()));
      resolve({ exitCode: 124, logs, output: outputParts.join("") });
    }, commandTimeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const content = chunk.toString("utf8");
      outputParts.push(content);
      logs.push(log("stdout", "info", content.trimEnd(), sequence++, new Date().toISOString()));
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const content = chunk.toString("utf8");
      outputParts.push(content);
      logs.push(log("stderr", "error", content.trimEnd(), sequence++, new Date().toISOString()));
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      logs.push(log("stderr", "error", error.message, sequence++, new Date().toISOString()));
      resolve({ exitCode: 1, logs, output: outputParts.join("") || error.message });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const exitCode = typeof code === "number" ? code : 1;
      logs.push(log("system", exitCode === 0 ? "success" : "error", `명령 종료 코드: ${exitCode}`, sequence, new Date().toISOString()));
      resolve({ exitCode, logs, output: outputParts.join("") });
    });
  });
}

function buildValidation(type: ProjectCommandType, command: string, exitCode: number, output: string): CodexValidationResult {
  return {
    type,
    command,
    status: exitCode === 0 ? "passed" : "failed",
    exitCode,
    outputSummary: summarizeOutput(output)
  };
}

function summarizeOutput(output: string) {
  const compact = output.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "출력 없이 종료되었습니다.";
  }

  return compact.length > 500 ? `${compact.slice(0, 497)}...` : compact;
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
