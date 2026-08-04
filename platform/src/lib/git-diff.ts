import { execFile } from "child_process";
import { promisify } from "util";

import type { CodexFileChange, CodexValidationResult } from "./codex-runner";
import { isPathInside } from "./project-scanner";

const execFileAsync = promisify(execFile);

export type GitDiffSnapshot = {
  isGitRepository: boolean;
  statusSummary: string;
  diffStat: string;
  patch: string;
  fileChanges: CodexFileChange[];
  validation: CodexValidationResult;
};

export async function collectGitDiffSnapshot(projectsRoot: string, projectPath: string): Promise<GitDiffSnapshot> {
  if (!isPathInside(projectsRoot, projectPath)) {
    throw new Error("PROJECTS_ROOT 밖에서는 git diff를 수집할 수 없습니다.");
  }

  const isGitRepository = await checkGitRepository(projectPath);

  if (!isGitRepository) {
    return {
      isGitRepository: false,
      statusSummary: "",
      diffStat: "",
      patch: "",
      fileChanges: [],
      validation: {
        type: "mock",
        command: "git rev-parse --is-inside-work-tree",
        status: "skipped",
        outputSummary: "Git 저장소가 아니므로 diff 수집을 건너뛰었습니다."
      }
    };
  }

  const [statusSummary, diffStat, patch] = await Promise.all([
    runGit(projectPath, ["status", "--short"]),
    runGit(projectPath, ["diff", "--stat"]),
    runGit(projectPath, ["diff", "--"])
  ]);

  return {
    isGitRepository: true,
    statusSummary,
    diffStat,
    patch,
    fileChanges: parseGitStatus(statusSummary, patch),
    validation: {
      type: "mock",
      command: "git status --short && git diff --stat && git diff --",
      status: "passed",
      exitCode: 0,
      outputSummary: statusSummary.trim() ? "Git 변경 사항을 수집했습니다." : "Git 변경 사항이 없습니다."
    }
  };
}

export function parseGitStatus(statusSummary: string, patch: string): CodexFileChange[] {
  const files = statusSummary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2).trim();
      const filePath = line.slice(2).trim();

      return {
        filePath,
        changeType: mapGitStatus(status),
        additions: 0,
        deletions: 0,
        patch: extractPatchForFile(patch, filePath)
      };
    });

  return files;
}

export function buildMockPatch(filePath = "src/example.ts") {
  return `diff --git a/${filePath} b/${filePath}
index 0000000..1111111 100644
--- a/${filePath}
+++ b/${filePath}
@@ -1,3 +1,4 @@
 export function example() {
+  // Mock 실행에서는 실제 파일을 수정하지 않습니다.
   return "ready";
 }
`;
}

async function checkGitRepository(projectPath: string) {
  try {
    const result = await runGit(projectPath, ["rev-parse", "--is-inside-work-tree"]);
    return result.trim() === "true";
  } catch {
    return false;
  }
}

async function runGit(projectPath: string, args: string[]) {
  const result = await execFileAsync("git", args, {
    cwd: projectPath,
    timeout: 30_000,
    windowsHide: true
  });

  return result.stdout;
}

function mapGitStatus(status: string): CodexFileChange["changeType"] {
  if (status.includes("D")) {
    return "deleted";
  }

  if (status.includes("A") || status.includes("??")) {
    return "created";
  }

  return "modified";
}

function extractPatchForFile(patch: string, filePath: string) {
  if (!patch.trim()) {
    return "";
  }

  const marker = `diff --git a/${filePath} b/${filePath}`;
  const start = patch.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const next = patch.indexOf("\ndiff --git ", start + marker.length);
  return next === -1 ? patch.slice(start) : patch.slice(start, next);
}
