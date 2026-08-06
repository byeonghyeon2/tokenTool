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
  const [validationMessage, setValidationMessage] = useState("");

  async function generatePrompt() {
    if (!selectedProject) return;

    if (changeRequest.trim().length < 5) {
      setValidationMessage("수정하고 싶은 내용을 5글자 이상 입력하세요.");
      setResult(null);
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setCopyState("idle");
    setValidationMessage("");

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
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">프로젝트 수정 요청</h2>
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="change-request">
          수정하고 싶은 내용
          <textarea
            id="change-request"
            value={changeRequest}
            onChange={(event) => {
              setChangeRequest(event.target.value);
              setResult(null);
              setCopyState("idle");
              setValidationMessage("");
            }}
            className="mt-2 min-h-36 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-600 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating}
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

        {validationMessage && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{validationMessage}</p>}
        {result && !result.ok && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{result.message}</p>}
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

          {copyState === "failed" && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">브라우저 권한 문제로 자동 복사에 실패했습니다.</p>}
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-4 font-mono text-xs leading-5 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            {result.prompt.content}
          </pre>
        </div>
      )}
    </section>
  );
}
