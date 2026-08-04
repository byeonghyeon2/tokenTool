import { readdir, readFile, stat } from "fs/promises";
import path from "path";

import type { CodexRunResult, CodexValidationResult } from "./codex-runner";

const workspaceRoot = path.resolve(process.cwd(), "..");
const runsRoot = path.join(workspaceRoot, "workspace-data", "runs");

export type CodexRunSummary = {
  id: string;
  provider: CodexRunResult["provider"];
  projectName: string;
  status: CodexRunResult["status"];
  exitCode: number;
  summary: string;
  startedAt: string;
  finishedAt: string;
  savedPath: string;
  fileChangeCount: number;
  validationCount: number;
  logCount: number;
  validationTypes: CodexValidationResult["type"][];
  validationCommands: string[];
};

export async function listCodexRuns() {
  const files = await readdir(runsRoot).catch(() => []);
  const runFiles = files.filter((file) => /^codex-run-\d+\.json$/.test(file));
  const runs = await Promise.all(
    runFiles.map(async (file) => {
      const filePath = path.join(runsRoot, file);
      const fileStat = await stat(filePath);
      const run = await readCodexRunFile(filePath);

      return {
        ...toRunSummary(run),
        savedPath: filePath,
        sortTime: fileStat.mtimeMs
      };
    })
  );

  return runs.sort((a, b) => b.sortTime - a.sortTime).map(stripSortTime);
}

export async function getCodexRun(runId: string) {
  const runs = await listCodexRuns();
  const run = runs.find((item) => item.id === runId);

  if (!run) {
    return null;
  }

  return readCodexRunFile(run.savedPath);
}

export async function readCodexRunFile(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const relative = path.relative(runsRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("workspace-data/runs 밖의 실행 결과는 읽을 수 없습니다.");
  }

  const content = await readFile(resolvedPath, "utf8");
  return JSON.parse(content) as CodexRunResult;
}

function stripSortTime<T extends CodexRunSummary & { sortTime: number }>(run: T): CodexRunSummary {
  return {
    id: run.id,
    provider: run.provider,
    projectName: run.projectName,
    status: run.status,
    exitCode: run.exitCode,
    summary: run.summary,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    savedPath: run.savedPath,
    fileChangeCount: run.fileChangeCount,
    validationCount: run.validationCount,
    logCount: run.logCount,
    validationTypes: run.validationTypes,
    validationCommands: run.validationCommands
  };
}

function toRunSummary(run: CodexRunResult): CodexRunSummary {
  return {
    id: run.id,
    provider: run.provider,
    projectName: run.projectName,
    status: run.status,
    exitCode: run.exitCode,
    summary: run.summary,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    savedPath: run.savedPath,
    fileChangeCount: run.fileChanges.length,
    validationCount: run.validations.length,
    logCount: run.logs.length,
    validationTypes: Array.from(new Set(run.validations.map((validation) => validation.type))),
    validationCommands: Array.from(new Set(run.validations.map((validation) => validation.command).filter(Boolean)))
  };
}
