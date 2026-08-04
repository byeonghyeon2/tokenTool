"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Clipboard, ExternalLink, FileText, Loader2, Play, Save, Square, X } from "lucide-react";

import { workflowSteps } from "@/lib/mock-data";
import type { ScannedProject } from "@/lib/project-scanner";

type AnalysisResponse =
  | {
      ok: true;
      analysis: {
        confirmedFindings: string[];
        relatedAreas: string[];
        confirmedFiles: Array<{ path: string; matchedTerms: string[]; reason: string }>;
        skippedSensitiveFiles: string[];
        savedPath: string;
      };
    }
  | { ok: false; message: string }
  | null;

type ChatGptPromptResponse =
  | {
      ok: true;
      prompt: { content: string; savedPath: string; createdAt: string };
    }
  | { ok: false; message: string }
  | null;

type CodexPromptSaveResponse =
  | {
      ok: true;
      message: string;
      prompt: { savedPath: string; createdAt: string };
    }
  | { ok: false; message: string }
  | null;

type CodexRunResponse =
  | {
      ok: boolean;
      run: {
        id: string;
        provider: "mock" | "codex-cli";
        status: "completed" | "failed" | "blocked" | "stopped";
        summary: string;
        exitCode: number;
        logs: Array<{ level: string; content: string; sequence: number }>;
        validations: Array<{ type: string; command: string; status: string; outputSummary: string }>;
        savedPath: string;
      };
    }
  | { ok: false; message: string }
  | null;

export function ChangeWorkflowPanel({
  projects,
  selectedProjectName,
  hideProjectSelect = false
}: {
  projects: ScannedProject[];
  selectedProjectName?: string;
  hideProjectSelect?: boolean;
}) {
  const initialProjectName =
    selectedProjectName && projects.some((project) => project.name === selectedProjectName) ? selectedProjectName : projects[0]?.name ?? "";
  const [selectedProject, setSelectedProject] = useState(initialProjectName);
  const [changeRequest, setChangeRequest] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse>(null);
  const [chatGptPrompt, setChatGptPrompt] = useState<ChatGptPromptResponse>(null);
  const [codexPrompt, setCodexPrompt] = useState("");
  const [codexSaveResult, setCodexSaveResult] = useState<CodexPromptSaveResponse>(null);
  const [codexRunResult, setCodexRunResult] = useState<CodexRunResponse>(null);
  const [provider, setProvider] = useState<"mock" | "codex-cli">("mock");
  const [confirmation, setConfirmation] = useState("");
  const [showRunModal, setShowRunModal] = useState(false);
  const [currentRunId, setCurrentRunId] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSavingCodexPrompt, setIsSavingCodexPrompt] = useState(false);
  const [isRunningCodex, setIsRunningCodex] = useState(false);
  const [isStoppingCodex, setIsStoppingCodex] = useState(false);

  const currentProject = projects.find((project) => project.name === selectedProject);
  const canAnalyze = useMemo(() => Boolean(selectedProject) && changeRequest.trim().length >= 5, [changeRequest, selectedProject]);

  async function analyzeRequest() {
    setIsAnalyzing(true);
    setAnalysis(null);
    setChatGptPrompt(null);
    setCodexSaveResult(null);
    setCodexRunResult(null);

    try {
      const response = await fetch("/api/change-requests/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: selectedProject, request: changeRequest })
      });
      setAnalysis((await response.json()) as AnalysisResponse);
    } catch (error) {
      setAnalysis({ ok: false, message: error instanceof Error ? error.message : "수정 요청 분석에 실패했습니다." });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function generatePrompt() {
    if (!analysis?.ok) return;
    setIsGeneratingPrompt(true);
    setChatGptPrompt(null);
    setCopyState("idle");

    try {
      const response = await fetch("/api/chatgpt/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisPath: analysis.analysis.savedPath })
      });
      setChatGptPrompt((await response.json()) as ChatGptPromptResponse);
    } catch (error) {
      setChatGptPrompt({ ok: false, message: error instanceof Error ? error.message : "ChatGPT 프롬프트 생성에 실패했습니다." });
    } finally {
      setIsGeneratingPrompt(false);
    }
  }

  async function copyPrompt() {
    if (!chatGptPrompt?.ok) return;

    try {
      await navigator.clipboard.writeText(chatGptPrompt.prompt.content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function saveCodexPrompt() {
    setIsSavingCodexPrompt(true);
    setCodexSaveResult(null);

    try {
      const response = await fetch("/api/codex/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: selectedProject, content: codexPrompt })
      });
      setCodexSaveResult((await response.json()) as CodexPromptSaveResponse);
      setCodexRunResult(null);
    } catch (error) {
      setCodexSaveResult({ ok: false, message: error instanceof Error ? error.message : "Codex 프롬프트 저장에 실패했습니다." });
    } finally {
      setIsSavingCodexPrompt(false);
    }
  }

  async function runCodex() {
    if (!codexSaveResult?.ok) return;
    setIsRunningCodex(true);
    setCodexRunResult(null);

    try {
      const response = await fetch("/api/codex/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: selectedProject,
          promptPath: codexSaveResult.prompt.savedPath,
          provider,
          confirmation: provider === "codex-cli" ? confirmation : undefined
        })
      });
      const data = (await response.json()) as CodexRunResponse;
      setCodexRunResult(data);

      if (data && "run" in data) {
        setCurrentRunId(data.run.id);
      }
    } catch (error) {
      setCodexRunResult({ ok: false, message: error instanceof Error ? error.message : "Codex 실행 요청에 실패했습니다." });
    } finally {
      setIsRunningCodex(false);
      setShowRunModal(false);
    }
  }

  async function stopCodex() {
    setIsStoppingCodex(true);

    try {
      await fetch("/api/codex/runs/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRunId || undefined })
      });
    } finally {
      setIsStoppingCodex(false);
    }
  }

  if (projects.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        프로젝트를 먼저 등록하면 수정 요청 분석과 ChatGPT 프롬프트 생성 흐름을 사용할 수 있습니다.
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">프로젝트 수정 요청</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              변경하고 싶은 내용을 적으면 관련 파일과 범위를 분석한 뒤 ChatGPT에 보낼 프롬프트를 만듭니다.
            </p>
          </div>
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">읽기 기반</span>
        </div>

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          {workflowSteps.slice(1, 4).map((step, index) => (
            <div key={step} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-center text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {index + 1}. {step}
            </div>
          ))}
        </div>

        {hideProjectSelect ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">현재 프로젝트</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{currentProject?.name ?? selectedProject}</p>
          </div>
        ) : (
          <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="project-select">
            분석할 프로젝트
            <select
              id="project-select"
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            >
              {projects.map((project) => (
                <option key={project.path} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="change-request">
          무엇을 수정할까요?
          <textarea
            id="change-request"
            value={changeRequest}
            onChange={(event) => setChangeRequest(event.target.value)}
            className="mt-2 min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-600 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: 블로그 글 생성 결과에 SEO 제목 후보와 태그 추천을 추가해줘."
          />
        </label>

        <button
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAnalyze || isAnalyzing}
          onClick={analyzeRequest}
          type="button"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
          변경분 분석
        </button>
      </section>

      <AnalysisPanel analysis={analysis} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">ChatGPT 프롬프트 생성</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          분석 결과만 정리해서 ChatGPT에 붙여넣을 프롬프트로 만듭니다. 전체 프로젝트를 보내지 않아 토큰 사용량을 줄이는 흐름입니다.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!analysis?.ok || isGeneratingPrompt}
            onClick={generatePrompt}
            type="button"
          >
            {isGeneratingPrompt ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
            생성
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={!chatGptPrompt?.ok}
            onClick={copyPrompt}
            type="button"
          >
            {copyState === "copied" ? <Check size={16} aria-hidden /> : <Clipboard size={16} aria-hidden />}
            {copyState === "copied" ? "복사 완료" : "복사"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer")}
            type="button"
          >
            <ExternalLink size={16} aria-hidden />
            ChatGPT
          </button>
        </div>
        <PromptPanel prompt={chatGptPrompt} copyState={copyState} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Codex 적용</h2>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{provider}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          ChatGPT 답변을 붙여넣고 저장하면, mock 또는 실제 Codex CLI 실행 흐름으로 넘길 수 있습니다.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="provider">
          실행 방식
          <select
            id="provider"
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as "mock" | "codex-cli");
              setConfirmation("");
            }}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="mock">mock - 실제 파일 수정 없음</option>
            <option value="codex-cli">codex-cli - 확인 문구 필요</option>
          </select>
        </label>
        <textarea
          value={codexPrompt}
          onChange={(event) => setCodexPrompt(event.target.value)}
          className="mt-4 min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none ring-blue-600 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          placeholder="ChatGPT 답변 또는 Codex에 넘길 최종 지시문을 붙여넣으세요."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={codexPrompt.trim().length < 10 || isSavingCodexPrompt}
            onClick={saveCodexPrompt}
            type="button"
          >
            {isSavingCodexPrompt ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />}
            저장
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!codexSaveResult?.ok || isRunningCodex}
            onClick={() => setShowRunModal(true)}
            type="button"
          >
            {isRunningCodex ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            Codex 실행
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            disabled={isStoppingCodex}
            onClick={stopCodex}
            type="button"
          >
            {isStoppingCodex ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Square size={16} aria-hidden />}
            중단
          </button>
        </div>
        <CodexSavePanel result={codexSaveResult} />
        <CodexRunPanel result={codexRunResult} />
      </section>

      {showRunModal && (
        <RunConfirmModal
          provider={provider}
          confirmation={confirmation}
          setConfirmation={setConfirmation}
          isRunning={isRunningCodex}
          onCancel={() => setShowRunModal(false)}
          onRun={runCodex}
        />
      )}
    </div>
  );
}

function RunConfirmModal({
  provider,
  confirmation,
  setConfirmation,
  isRunning,
  onCancel,
  onRun
}: {
  provider: "mock" | "codex-cli";
  confirmation: string;
  setConfirmation: (value: string) => void;
  isRunning: boolean;
  onCancel: () => void;
  onRun: () => void;
}) {
  const needsConfirmation = provider === "codex-cli";
  const canRun = !needsConfirmation || confirmation === "RUN_CODEX_CLI";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Codex 실행 확인</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              mock은 실제 파일을 수정하지 않습니다. codex-cli는 확인 문구를 입력해야 실행됩니다.
            </p>
          </div>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onCancel} type="button">
            <X size={16} aria-hidden />
          </button>
        </div>
        {needsConfirmation && (
          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="codex-confirmation">
            실제 CLI 실행 확인 문구
            <input
              id="codex-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="RUN_CODEX_CLI"
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800" onClick={onCancel} type="button">
            취소
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canRun || isRunning}
            onClick={onRun}
            type="button"
          >
            {isRunning ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            실행
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: AnalysisResponse }) {
  if (!analysis) return null;
  if (!analysis.ok) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{analysis.message}</section>;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <FileText size={17} className="text-blue-600" aria-hidden />
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">분석 결과</h2>
      </div>
      <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
        {analysis.analysis.confirmedFindings.map((finding) => (
          <p key={finding}>{finding}</p>
        ))}
        {analysis.analysis.relatedAreas.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">관련 영역: {analysis.analysis.relatedAreas.join(", ")}</p>}
      </div>
      <div className="mt-4 space-y-2">
        {analysis.analysis.confirmedFiles.slice(0, 8).map((file) => (
          <div key={file.path} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <p className="font-mono text-xs text-slate-800 dark:text-slate-100">{file.path}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {file.reason}
              {file.matchedTerms.length > 0 ? ` · ${file.matchedTerms.join(", ")}` : ""}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 break-all text-xs text-slate-500 dark:text-slate-400">저장 위치: {analysis.analysis.savedPath}</p>
      {analysis.analysis.skippedSensitiveFiles.length > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">민감 파일 {analysis.analysis.skippedSensitiveFiles.length}개는 분석에서 제외했습니다.</p>
      )}
    </section>
  );
}

function PromptPanel({ prompt, copyState }: { prompt: ChatGptPromptResponse; copyState: "idle" | "copied" | "failed" }) {
  if (!prompt) return null;
  if (!prompt.ok) return <p className="mt-3 text-sm text-red-700 dark:text-red-300">{prompt.message}</p>;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="break-all text-xs text-slate-500 dark:text-slate-400">저장 위치: {prompt.prompt.savedPath}</p>
      {copyState === "failed" && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">브라우저 권한 때문에 자동 복사에 실패했습니다.</p>}
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {prompt.prompt.content}
      </pre>
    </div>
  );
}

function CodexSavePanel({ result }: { result: CodexPromptSaveResponse }) {
  if (!result) return null;

  return (
    <div
      className={`mt-4 rounded-lg border p-3 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      }`}
    >
      <p className="font-medium">{result.message}</p>
      {result.ok && <p className="mt-1 break-all text-xs">{result.prompt.savedPath}</p>}
    </div>
  );
}

function CodexRunPanel({ result }: { result: CodexRunResponse }) {
  if (!result) return null;
  if (!("run" in result)) return <p className="mt-4 text-sm text-red-700 dark:text-red-300">{result.message}</p>;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          {result.run.status}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{result.run.provider}</span>
        <span className="text-xs text-slate-500">exit {result.run.exitCode}</span>
      </div>
      <p className="mt-3 font-medium">{result.run.summary}</p>
      <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">저장 위치: {result.run.savedPath}</p>
      <div className="mt-3 space-y-2">
        {result.run.logs.map((log) => (
          <div key={`${log.sequence}-${log.content}`} className="rounded-md bg-white px-3 py-2 font-mono text-xs dark:bg-slate-900">
            [{log.level}] {log.content}
          </div>
        ))}
      </div>
    </div>
  );
}
