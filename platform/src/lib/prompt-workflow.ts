import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { ChangeAnalysisResult } from "./change-analysis";

const workspaceRoot = path.resolve(process.cwd(), "..");
const runsRoot = path.join(workspaceRoot, "workspace-data", "runs");

export type GeneratedPromptResult = {
  content: string;
  savedPath: string;
  createdAt: string;
};

export type SavedCodexPromptResult = {
  content: string;
  savedPath: string;
  createdAt: string;
};

export function isPathInsideOrEqual(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveRunFile(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  if (!isPathInsideOrEqual(runsRoot, resolvedPath)) {
    throw new Error("workspace-data/runs 밖의 파일은 사용할 수 없습니다.");
  }

  return resolvedPath;
}

export async function loadAnalysisResult(analysisPath: string) {
  const resolvedPath = resolveRunFile(analysisPath);
  const content = await readFile(resolvedPath, "utf8");
  return JSON.parse(content) as ChangeAnalysisResult;
}

export function buildChatGptPrompt(analysis: ChangeAnalysisResult) {
  const confirmedFiles = analysis.confirmedFiles
    .map((file) => `- ${file.path}: ${file.reason}${file.matchedTerms.length ? ` (${file.matchedTerms.join(", ")})` : ""}`)
    .join("\n");
  const candidateFiles = analysis.candidateFiles.map((file) => `- ${file.path}: ${file.reason}`).join("\n");
  const risks = analysis.risks.map((risk) => `- ${risk}`).join("\n");
  const unknowns = analysis.unknowns.map((unknown) => `- ${unknown}`).join("\n");

  return `# ChatGPT Plus 변경 분석 요청

당신은 Codex 실행 프롬프트를 준비하는 개발 분석가입니다.

아래 정보만 사용해서 Codex에게 전달할 구현 프롬프트를 작성하세요.
사실과 추정을 구분하고, 선택한 프로젝트 밖 파일을 읽거나 수정하라고 지시하지 마세요.

## 프로젝트

- 이름: ${analysis.projectName}
- 경로: ${analysis.projectPath}

## 사용자 변경 요청

${analysis.request}

## 읽기 전용 분석 결과

${analysis.confirmedFindings.map((finding) => `- ${finding}`).join("\n")}

## 관련 영역

${analysis.relatedAreas.length ? analysis.relatedAreas.map((area) => `- ${area}`).join("\n") : "- 아직 특정 영역을 확정하지 못했습니다."}

## 확인된 관련 파일

${confirmedFiles || "- 직접 관련 파일을 찾지 못했습니다."}

## 참고 후보 파일

${candidateFiles || "- 참고 후보 파일이 없습니다."}

## 제외된 민감 파일

- ${analysis.skippedSensitiveFiles.length}개 파일은 민감 파일 규칙에 따라 제외했습니다.

## 위험 요소

${risks || "- 특별히 기록된 위험 요소가 없습니다."}

## 불확실한 점

${unknowns || "- 현재 기록된 불확실한 점이 없습니다."}

## ChatGPT 출력 형식

다음 형식으로 Codex용 프롬프트를 작성하세요.

1. 구현 목표
2. 수정할 가능성이 높은 파일
3. 먼저 읽어야 할 파일
4. 변경 금지 또는 주의 사항
5. 단계별 구현 지시
6. 검증 명령
7. 최종 Codex 프롬프트
`;
}

export async function generateChatGptPrompt(analysisPath: string): Promise<GeneratedPromptResult> {
  const analysis = await loadAnalysisResult(analysisPath);
  const content = buildChatGptPrompt(analysis);
  const createdAt = new Date().toISOString();
  const savedPath = path.join(runsRoot, `chatgpt-prompt-${Date.now()}.md`);

  await mkdir(runsRoot, { recursive: true });
  await writeFile(savedPath, content, "utf8");

  return { content, savedPath, createdAt };
}

export async function saveCodexPrompt({
  projectName,
  content
}: {
  projectName: string;
  content: string;
}): Promise<SavedCodexPromptResult> {
  const createdAt = new Date().toISOString();
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "project";
  const savedPath = path.join(runsRoot, `codex-prompt-${safeProjectName}-${Date.now()}.md`);

  await mkdir(runsRoot, { recursive: true });
  await writeFile(savedPath, content, "utf8");

  return { content, savedPath, createdAt };
}
