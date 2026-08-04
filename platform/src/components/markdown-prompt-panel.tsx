"use client";

import { useState } from "react";
import { Check, Clipboard, FileText, Loader2, Sparkles } from "lucide-react";

import type { ScannedProject } from "@/lib/project-scanner";

type MarkdownPromptResponse =
  | {
      ok: true;
      prompt: {
        content: string;
        savedPath: string;
        createdAt: string;
        markdownFiles: Array<{ path: string; chars: number }>;
      };
    }
  | { ok: false; message: string }
  | null;

export function MarkdownPromptPanel({
  projects,
  selectedProjectName
}: {
  projects: ScannedProject[];
  selectedProjectName?: string;
}) {
  const selectedProject = projects.find((project) => project.name === selectedProjectName) ?? projects[0];
  const [changeRequest, setChangeRequest] = useState("");
  const [result, setResult] = useState<MarkdownPromptResponse>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function generatePrompt() {
    if (!selectedProject) return;

    setIsGenerating(true);
    setResult(null);
    setCopyState("idle");

    try {
      const response = await fetch("/api/chatgpt/markdown-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: selectedProject.name,
          changeRequest
        })
      });
      const data = (await response.json()) as MarkdownPromptResponse;
      setResult(data);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "프롬프트 생성에 실패했습니다." });
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyPrompt() {
    if (!result?.ok) return;

    try {
      await navigator.clipboard.writeText(result.prompt.content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (!selectedProject) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        프로젝트를 먼저 등록하면 Markdown 문서 기반 분석 프롬프트를 만들 수 있습니다.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">프로젝트 수정 요청</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            프로젝트의 Markdown 문서와 사용자가 원하는 수정 내용을 조합해 ChatGPT에 복붙할 분석 프롬프트를 생성합니다.
          </p>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">복붙 기본 흐름</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="change-request">
            내가 수정하고자 하는 내용
            <textarea
              id="change-request"
              value={changeRequest}
              onChange={(event) => {
                setChangeRequest(event.target.value);
                setResult(null);
                setCopyState("idle");
              }}
              className="mt-2 min-h-36 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-600 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              placeholder="예: 블로그 글 생성 결과에 SEO 제목 후보와 태그 추천을 추가하고, 티스토리에 복사하기 쉬운 형식으로 정리하고 싶다."
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={changeRequest.trim().length < 5 || isGenerating}
              onClick={generatePrompt}
              type="button"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
              프롬프트 생성하기
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={!result?.ok}
              onClick={copyPrompt}
              type="button"
            >
              {copyState === "copied" ? <Check size={16} aria-hidden /> : <Clipboard size={16} aria-hidden />}
              {copyState === "copied" ? "복사 완료" : "프롬프트 복사"}
            </button>
          </div>

          {result && !result.ok && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{result.message}</p>}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">프롬프트 재료</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <InfoLine label="프로젝트" value={selectedProject.name} />
            <InfoLine label="스택" value={selectedProject.stack} />
            <InfoLine label="Git 변경" value={`${selectedProject.changes}개`} />
            <InfoLine label="브랜치" value={selectedProject.branch} />
          </div>
        </aside>
      </div>

      {result?.ok && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">생성된 ChatGPT 분석 프롬프트</p>
              <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">저장 위치: {result.prompt.savedPath}</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Markdown {result.prompt.markdownFiles.length}개 포함</p>
          </div>

          {result.prompt.markdownFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.prompt.markdownFiles.map((file) => (
                <span key={file.path} className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {file.path}
                </span>
              ))}
            </div>
          )}

          {copyState === "failed" && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">브라우저 권한 때문에 자동 복사에 실패했습니다.</p>}
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-4 font-mono text-xs leading-5 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            {result.prompt.content}
          </pre>
        </div>
      )}
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-800 dark:text-slate-100" title={value}>
        {value}
      </p>
    </div>
  );
}
