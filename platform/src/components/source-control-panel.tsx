"use client";

import { CheckCircle2, DownloadCloud, GitBranch, Loader2, RefreshCw, Save, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { SourceControlOperationResult, SourceControlStatus } from "@/lib/management-source-control";

type StatusResponse = {
  ok: boolean;
  status: SourceControlStatus;
};

export function SourceControlPanel() {
  const [status, setStatus] = useState<SourceControlStatus | null>(null);
  const [operationResult, setOperationResult] = useState<SourceControlOperationResult | null>(null);
  const [commitMessage, setCommitMessage] = useState("Update management tool source");
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  async function loadStatus() {
    setIsLoading(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/source-control/status", { cache: "no-store" });
      const data = (await response.json()) as StatusResponse;
      setStatus(data.status);
    } finally {
      setIsLoading(false);
    }
  }

  async function commitSource() {
    setIsCommitting(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/source-control/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage })
      });
      const data = (await response.json()) as SourceControlOperationResult;
      setOperationResult(data);
      await loadStatus();
    } catch (error) {
      setOperationResult(buildClientError(error, "커밋 실행 중 오류가 발생했습니다."));
    } finally {
      setIsCommitting(false);
    }
  }

  async function pullSource() {
    setIsPulling(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/source-control/pull", { method: "POST" });
      const data = (await response.json()) as SourceControlOperationResult;
      setOperationResult(data);
      await loadStatus();
    } catch (error) {
      setOperationResult(buildClientError(error, "pull 실행 중 오류가 발생했습니다."));
    } finally {
      setIsPulling(false);
    }
  }

  async function pushSource() {
    setIsPushing(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/source-control/push", { method: "POST" });
      const data = (await response.json()) as SourceControlOperationResult;
      setOperationResult(data);
      await loadStatus();
    } catch (error) {
      setOperationResult(buildClientError(error, "push 실행 중 오류가 발생했습니다."));
    } finally {
      setIsPushing(false);
    }
  }

  function buildClientError(error: unknown, fallback: string): SourceControlOperationResult {
    return {
      ok: false,
      message: error instanceof Error ? error.message : fallback,
      branch: status?.branch ?? "",
      remoteUrl: status?.remoteUrl ?? "",
      output: ""
    };
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Source control</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">관리툴 소스 관리</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          이 화면은 관리툴 저장소만 관리합니다. 실제 프로젝트 소스는 `projects` 아래에서 별도 Git 저장소로 관리합니다.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-blue-600" aria-hidden />
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Git 상태</h2>
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={isLoading}
            onClick={loadStatus}
            type="button"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
            새로고침
          </button>
        </div>

        {status ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Info label="저장소 경로" value={status.workspaceRoot} />
            <Info label="브랜치" value={status.branch} />
            <Info label="커밋" value={status.commit} />
            <Info label="원격 저장소" value={status.remoteUrl || "없음"} />
            <Info label="upstream" value={status.upstream || "미설정"} />
            <Info label="SSL backend" value={status.sslBackend || "미설정"} />
            <StateInfo label="토큰" ok={status.tokenConfigured} okText="GITHUB_TOKEN 감지됨" failText="GITHUB_TOKEN 없음" />
            <StateInfo label="작업트리" ok={status.workingTreeClean} okText="커밋할 변경 없음" failText="커밋되지 않은 변경 있음" />
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">상태를 불러오는 중입니다.</p>
        )}
      </section>

      {status && status.notes.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="font-semibold">조치 필요</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {status.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {status && status.changes.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">커밋되지 않은 변경사항</h2>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{status.changes.join("\n")}</pre>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">관리툴 소스 작업</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              루트 `.env`의 `GITHUB_TOKEN`을 사용해 GitHub pull/push를 실행합니다. 토큰 값은 화면과 로그에 출력하지 않습니다.
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="commit-message">
            커밋 메시지
            <input
              id="commit-message"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isCommitting || !status?.commitReady}
              onClick={commitSource}
              type="button"
            >
              {isCommitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
              변경사항 커밋
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isPulling || !status?.pullReady}
              onClick={pullSource}
              type="button"
            >
              {isPulling ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <DownloadCloud size={16} aria-hidden />}
              GitHub에서 pull
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPushing || !status?.pushReady}
              onClick={pushSource}
              type="button"
            >
              {isPushing ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <UploadCloud size={16} aria-hidden />}
              GitHub에 push
            </button>
          </div>
        </div>

        {operationResult && (
          <div
            className={`mt-4 rounded-lg border p-4 text-sm ${
              operationResult.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
            }`}
          >
            <p className="font-semibold">{operationResult.message}</p>
            {operationResult.output && <pre className="mt-2 whitespace-pre-wrap break-all text-xs">{operationResult.output}</pre>}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function StateInfo({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
        {ok ? <CheckCircle2 size={15} aria-hidden /> : <XCircle size={15} aria-hidden />}
        {ok ? okText : failText}
      </p>
    </div>
  );
}
