import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { executeCodexCli } from "./codex-cli-executor";
import { buildMockPatch, collectGitDiffSnapshot } from "./git-diff";
import { resolveRunFile } from "./prompt-workflow";
import { getProjectsRoot, isPathInside, scanProjectCandidate, type ScannedProject } from "./project-scanner";

export type CodexRunLog = {
  stream: "system" | "stdout" | "stderr";
  level: "info" | "warn" | "error" | "success";
  content: string;
  sequence: number;
  createdAt: string;
};

export type CodexFileChange = {
  filePath: string;
  changeType: "mock" | "created" | "modified" | "deleted";
  additions: number;
  deletions: number;
  patch?: string;
};

export type CodexValidationResult = {
  type: "run" | "lint" | "typecheck" | "test" | "build" | "mock" | "codex";
  command: string;
  status: "passed" | "failed" | "skipped";
  exitCode?: number;
  outputSummary: string;
};

export type CodexRunResult = {
  id: string;
  provider: "mock" | "codex-cli";
  projectName: string;
  projectPath: string;
  promptPath: string;
  status: "completed" | "failed" | "blocked" | "stopped";
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  summary: string;
  logs: CodexRunLog[];
  fileChanges: CodexFileChange[];
  validations: CodexValidationResult[];
  savedPath: string;
};

const workspaceRoot = path.resolve(process.cwd(), "..");
const runsRoot = path.join(workspaceRoot, "workspace-data", "runs");

export async function runCodex({
  projectName,
  promptPath,
  provider = normalizeProvider(process.env.CODEX_PROVIDER),
  confirmation
}: {
  projectName: string;
  promptPath: string;
  provider?: "mock" | "codex-cli";
  confirmation?: string;
}) {
  const projectsRoot = getProjectsRoot();
  const projectPath = path.resolve(projectsRoot, projectName);

  if (!isPathInside(projectsRoot, projectPath)) {
    throw new Error("PROJECTS_ROOT 밖의 프로젝트에서는 Codex를 실행할 수 없습니다.");
  }

  const project = await scanProjectCandidate(projectPath);

  if (!project) {
    throw new Error("프로젝트 감지 기준 파일을 찾지 못했습니다.");
  }

  const resolvedPromptPath = resolveRunFile(promptPath);
  const prompt = await readFile(resolvedPromptPath, "utf8");
  const gitSnapshot = await collectGitDiffSnapshot(projectsRoot, projectPath);

  if (provider === "codex-cli") {
    if (canRunCodexCli(confirmation)) {
      return saveRunResult(
        await buildCliRun({
          projectName,
          projectPath,
          project,
          promptPath: resolvedPromptPath,
          prompt,
          gitSnapshot
        })
      );
    }

    return saveRunResult(
      buildBlockedRun({
        projectName,
        projectPath,
        project,
        promptPath: resolvedPromptPath,
        prompt,
        gitSnapshot,
        confirmation
      })
    );
  }

  return saveRunResult(
    buildMockRun({
      projectName,
      projectPath,
      project,
      promptPath: resolvedPromptPath,
      prompt,
      gitSnapshot
    })
  );
}

export async function stopCodexRun(runId?: string) {
  const now = new Date().toISOString();
  const result = {
    ok: true,
    runId,
    message: "현재 MVP mock 실행은 즉시 완료되므로 중단할 실행 프로세스가 없습니다.",
    stoppedAt: now
  };

  await mkdir(runsRoot, { recursive: true });
  await writeFile(path.join(runsRoot, `codex-stop-${Date.now()}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return result;
}

export function normalizeProvider(provider: string | undefined): "mock" | "codex-cli" {
  return provider === "codex-cli" ? "codex-cli" : "mock";
}

export function summarizePrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

export function canRunCodexCli(confirmation: string | undefined) {
  return confirmation === "RUN_CODEX_CLI" && process.env.CODEX_CLI_ENABLED === "true";
}

function buildMockRun({
  projectName,
  projectPath,
  project,
  promptPath,
  prompt,
  gitSnapshot
}: {
  projectName: string;
  projectPath: string;
  project: ScannedProject;
  promptPath: string;
  prompt: string;
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
}): CodexRunResult {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date().toISOString();
  const promptSummary = summarizePrompt(prompt);

  return {
    id: randomUUID(),
    provider: "mock",
    projectName,
    projectPath,
    promptPath,
    status: "completed",
    startedAt,
    finishedAt,
    exitCode: 0,
    summary: "Mock Codex 실행을 완료했습니다. 실제 파일은 수정하지 않았습니다.",
    logs: [
      log("system", "info", "Mock provider로 Codex 실행을 시작했습니다.", 1, startedAt),
      log("system", "info", `프로젝트 범위: ${projectPath}`, 2, startedAt),
      log("stdout", "info", `프롬프트 요약: ${promptSummary}`, 3, startedAt),
      log("stdout", "success", "실제 코드 변경 없이 실행 결과 구조를 생성했습니다.", 4, finishedAt)
    ],
    fileChanges:
      gitSnapshot.fileChanges.length > 0
        ? gitSnapshot.fileChanges
        : [
            {
              filePath: "(mock) example diff",
              changeType: "mock",
              additions: 1,
              deletions: 0,
              patch: buildMockPatch()
            }
          ],
    validations: [
      gitSnapshot.validation,
      ...buildProjectCommandValidations(project),
      {
        type: "mock",
        command: "CODEX_PROVIDER=mock",
        status: "passed",
        exitCode: 0,
        outputSummary: "Mock 모드에서는 실제 Codex CLI와 검증 명령을 실행하지 않습니다."
      }
    ],
    savedPath: ""
  };
}

function buildBlockedRun({
  projectName,
  projectPath,
  project,
  promptPath,
  prompt,
  gitSnapshot,
  confirmation
}: {
  projectName: string;
  projectPath: string;
  project: ScannedProject;
  promptPath: string;
  prompt: string;
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
  confirmation?: string;
}): CodexRunResult {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date().toISOString();
  const enabled = process.env.CODEX_CLI_ENABLED === "true";
  const confirmed = confirmation === "RUN_CODEX_CLI";
  const reason = !confirmed
    ? "확인 문구 RUN_CODEX_CLI가 없어 실제 Codex CLI 실행을 차단했습니다."
    : !enabled
      ? "CODEX_CLI_ENABLED=true가 설정되지 않아 실제 Codex CLI 실행을 차단했습니다."
      : "Codex CLI 실행 조건을 다시 확인해야 합니다.";

  return {
    id: randomUUID(),
    provider: "codex-cli",
    projectName,
    projectPath,
    promptPath,
    status: "blocked",
    startedAt,
    finishedAt,
    exitCode: 1,
    summary: reason,
    logs: [
      log("system", "warn", "CODEX_PROVIDER=codex-cli 요청을 감지했습니다.", 1, startedAt),
      log("system", "warn", reason, 2, finishedAt),
      log("stdout", "info", `프롬프트 요약: ${summarizePrompt(prompt)}`, 3, finishedAt)
    ],
    fileChanges: gitSnapshot.fileChanges,
    validations: [
      gitSnapshot.validation,
      ...buildProjectCommandValidations(project),
      {
        type: "mock",
        command: "codex-cli safety gate",
        status: "skipped",
        outputSummary: "실제 Codex CLI 실행은 명령 형식, 권한, 사용자 확인 문구가 모두 확정된 뒤 연결합니다."
      }
    ],
    savedPath: ""
  };
}

async function buildCliRun({
  projectName,
  projectPath,
  project,
  promptPath,
  prompt,
  gitSnapshot
}: {
  projectName: string;
  projectPath: string;
  project: ScannedProject;
  promptPath: string;
  prompt: string;
  gitSnapshot: Awaited<ReturnType<typeof collectGitDiffSnapshot>>;
}): Promise<CodexRunResult> {
  const startedAt = new Date().toISOString();
  const execution = await executeCodexCli({
    cwd: projectPath,
    prompt,
    startedAt
  });
  const finishedAt = new Date().toISOString();

  return {
    id: randomUUID(),
    provider: "codex-cli",
    projectName,
    projectPath,
    promptPath,
    status: execution.exitCode === 0 ? "completed" : "failed",
    startedAt,
    finishedAt,
    exitCode: execution.exitCode,
    summary: execution.exitCode === 0 ? "Codex CLI 실행을 완료했습니다." : "Codex CLI 실행에 실패했습니다.",
    logs: execution.logs,
    fileChanges: gitSnapshot.fileChanges,
    validations: [gitSnapshot.validation, ...buildProjectCommandValidations(project), execution.validation],
    savedPath: ""
  };
}

async function saveRunResult(run: CodexRunResult) {
  await mkdir(runsRoot, { recursive: true });
  const savedPath = path.join(runsRoot, `codex-run-${Date.now()}.json`);
  const result = { ...run, savedPath };
  await writeFile(savedPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

function buildProjectCommandValidations(project: ScannedProject): CodexValidationResult[] {
  return [
    commandValidation("lint", project.lintCommand),
    commandValidation("typecheck", project.typecheckCommand),
    commandValidation("test", project.testCommand),
    commandValidation("build", project.buildCommand)
  ].filter((validation): validation is CodexValidationResult => Boolean(validation));
}

function commandValidation(type: CodexValidationResult["type"], command: string): CodexValidationResult | null {
  if (!command) {
    return null;
  }

  return {
    type,
    command,
    status: "skipped",
    outputSummary: "프로젝트 요약에 저장된 검증 명령입니다. 자동 실행은 아직 안전 게이트 뒤에 있습니다."
  };
}

function log(stream: CodexRunLog["stream"], level: CodexRunLog["level"], content: string, sequence: number, createdAt: string) {
  return {
    stream,
    level,
    content,
    sequence,
    createdAt
  };
}
