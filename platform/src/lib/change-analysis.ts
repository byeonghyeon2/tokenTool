import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import { isSensitivePath } from "./utils";

export type AnalysisFile = {
  path: string;
  reason: string;
  matchedTerms: string[];
};

export type ChangeAnalysisResult = {
  projectName: string;
  projectPath: string;
  request: string;
  confirmedFindings: string[];
  relatedAreas: string[];
  confirmedFiles: AnalysisFile[];
  candidateFiles: AnalysisFile[];
  skippedSensitiveFiles: string[];
  currentBehavior: string;
  risks: string[];
  unknowns: string[];
  savedPath: string;
  createdAt: string;
};

const ignoredDirectories = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", ".turbo", ".cache"]);
const readableExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".html",
  ".prisma",
  ".sql",
  ".xml",
  ".yml",
  ".yaml",
  ".env.example"
]);

const maxReadableFileSize = 200_000;
const maxCandidateFiles = 20;

export function extractSearchTerms(request: string) {
  const normalized = request
    .replace(/[^\p{L}\p{N}_/-]+/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized.filter((term) => term.length >= 2))).slice(0, 30);
}

export async function analyzeChangeRequest({
  projectName,
  projectPath,
  request,
  workspaceRoot
}: {
  projectName: string;
  projectPath: string;
  request: string;
  workspaceRoot: string;
}): Promise<ChangeAnalysisResult> {
  const terms = extractSearchTerms(request);
  const files = await collectReadableFiles(projectPath);
  const skippedSensitiveFiles = files.skippedSensitiveFiles.map((file) => path.relative(projectPath, file));
  const scoredFiles = await scoreFiles(projectPath, files.readableFiles, terms);
  const confirmedFiles = scoredFiles.filter((file) => file.matchedTerms.length > 0).slice(0, maxCandidateFiles);
  const candidateFiles = scoredFiles.filter((file) => file.matchedTerms.length === 0).slice(0, 8);
  const relatedAreas = Array.from(new Set(confirmedFiles.map((file) => file.path.split(/[\\/]/)[0]).filter(Boolean))).slice(0, 10);
  const createdAt = new Date().toISOString();
  const savedPath = path.join(workspaceRoot, "workspace-data", "runs", `analysis-${Date.now()}.json`);

  const result: ChangeAnalysisResult = {
    projectName,
    projectPath,
    request,
    confirmedFindings:
      confirmedFiles.length > 0
        ? [`요청 키워드와 일치하는 파일 ${confirmedFiles.length}개를 찾았습니다.`]
        : ["요청 키워드와 직접 일치하는 파일은 아직 찾지 못했습니다."],
    relatedAreas,
    confirmedFiles,
    candidateFiles,
    skippedSensitiveFiles,
    currentBehavior: "이 단계는 읽기 전용 분석이며, 프로젝트 파일을 수정하지 않습니다.",
    risks: [
      "키워드 기반 1차 분석이므로 실제 영향 범위는 후속 코드 확인에서 달라질 수 있습니다.",
      "대용량 파일과 민감 파일은 분석에서 제외했습니다."
    ],
    unknowns: confirmedFiles.length > 0 ? [] : ["요청과 직접 연결되는 파일을 더 좁히려면 기능명, 화면명, API 경로를 추가로 입력하는 것이 좋습니다."],
    savedPath,
    createdAt
  };

  await mkdir(path.dirname(savedPath), { recursive: true });
  await writeFile(savedPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return result;
}

async function collectReadableFiles(projectPath: string) {
  const readableFiles: string[] = [];
  const skippedSensitiveFiles: string[] = [];

  async function walk(currentPath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await walk(entryPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isSensitivePath(entryPath)) {
        skippedSensitiveFiles.push(entryPath);
        continue;
      }

      const extension = path.extname(entry.name);

      if (!readableExtensions.has(extension) && !readableExtensions.has(entry.name)) {
        continue;
      }

      const fileStat = await stat(entryPath);

      if (fileStat.size > maxReadableFileSize) {
        continue;
      }

      readableFiles.push(entryPath);
    }
  }

  await walk(projectPath);
  return { readableFiles, skippedSensitiveFiles };
}

async function scoreFiles(projectPath: string, files: string[], terms: string[]) {
  const scored = await Promise.all(
    files.map(async (filePath) => {
      const relativePath = path.relative(projectPath, filePath);
      const content = await readFile(filePath, "utf8").catch(() => "");
      const haystack = `${relativePath}\n${content}`.toLowerCase();
      const matchedTerms = terms.filter((term) => haystack.includes(term.toLowerCase()));

      return {
        path: relativePath,
        reason: matchedTerms.length > 0 ? "변경 요청 키워드와 일치" : "프로젝트 기본 참고 후보",
        matchedTerms
      };
    })
  );

  return scored.sort((a, b) => b.matchedTerms.length - a.matchedTerms.length || a.path.localeCompare(b.path));
}
