"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, FileDiff, ListChecks, ScrollText, XCircle } from "lucide-react";

import type { CodexRunLog, CodexRunResult, CodexValidationResult } from "@/lib/codex-runner";

export function RunDetailView({ run }: { run: CodexRunResult }) {
  const groupedValidations = useMemo(() => groupValidations(run.validations), [run.validations]);

  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/runs"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} aria-hidden />
          작업 기록으로 돌아가기
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Run detail</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{run.projectName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{run.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={run.status} />
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {run.provider}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              exit {run.exitCode}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoItem label="Run ID" value={run.id} />
        <InfoItem label="Prompt" value={run.promptPath || "프로젝트 명령 실행"} />
        <InfoItem label="Project Path" value={run.projectPath} />
        <InfoItem label="Saved Path" value={run.savedPath} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel icon={ScrollText} title="로그">
          <div className="space-y-2">
            {run.logs.length > 0 ? (
              run.logs.map((log) => <LogRow key={`${log.sequence}-${log.content}`} log={log} />)
            ) : (
              <EmptyText>기록된 로그가 없습니다.</EmptyText>
            )}
          </div>
        </Panel>

        <Panel icon={ListChecks} title="검증 결과">
          <div className="space-y-4">
            {groupedValidations.length > 0 ? (
              groupedValidations.map((group) => <ValidationGroup key={group.type} type={group.type} validations={group.validations} />)
            ) : (
              <EmptyText>기록된 검증 결과가 없습니다.</EmptyText>
            )}
          </div>
        </Panel>
      </section>

      <Panel icon={FileDiff} title="파일 변경">
        <div className="space-y-3">
          {run.fileChanges.length > 0 ? (
            run.fileChanges.map((change) => (
              <div key={change.filePath} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-100">{change.filePath}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {change.changeType}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  +{change.additions} / -{change.deletions}
                </p>
                {change.patch && (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-100">
                    {highlightPatch(change.patch)}
                  </pre>
                )}
              </div>
            ))
          ) : (
            <EmptyText>기록된 파일 변경이 없습니다.</EmptyText>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof ScrollText; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-blue-600" aria-hidden />
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LogRow({ log }: { log: CodexRunLog }) {
  const [isOpen, setIsOpen] = useState(log.content.length < 260);
  const isLong = log.content.length >= 260 || log.content.includes("\n");
  const preview = isLong && !isOpen ? `${log.content.replace(/\s+/g, " ").slice(0, 220)}...` : log.content;

  return (
    <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
          <span>#{log.sequence}</span>
          <span>{log.stream}</span>
          <LogLevelBadge level={log.level} />
          <span>{formatDate(log.createdAt)}</span>
        </div>
        {isLong && (
          <button
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setIsOpen((value) => !value)}
            type="button"
          >
            {isOpen ? <ChevronDown size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />}
            {isOpen ? "접기" : "펼치기"}
          </button>
        )}
      </div>
      <p className={`mt-2 whitespace-pre-wrap text-slate-800 dark:text-slate-100 ${isOpen ? "" : "max-h-16 overflow-hidden"}`}>{preview}</p>
    </div>
  );
}

function ValidationGroup({ type, validations }: { type: CodexValidationResult["type"]; validations: CodexValidationResult[] }) {
  const hasFailure = validations.some((validation) => validation.status === "failed");
  const hasSkipped = validations.some((validation) => validation.status === "skipped");
  const status = hasFailure ? "failed" : hasSkipped ? "skipped" : "passed";

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white">{type}</span>
          <ValidationStatusBadge status={status} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{validations.length}개 결과</span>
      </div>
      <div className="mt-3 space-y-3">
        {validations.map((validation) => (
          <div key={`${validation.type}-${validation.command}-${validation.outputSummary}`} className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-2">
              <ValidationStatusBadge status={validation.status} />
              {typeof validation.exitCode === "number" && <span className="text-xs text-slate-500 dark:text-slate-400">exit {validation.exitCode}</span>}
            </div>
            <p className="mt-2 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{validation.command}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{validation.outputSummary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed";
  const isFailed = status === "failed" || status === "blocked";
  const Icon = isSuccess ? CheckCircle2 : isFailed ? XCircle : ListChecks;
  const classes = isSuccess
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
    : isFailed
      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${classes}`}>
      <Icon size={13} aria-hidden />
      {status}
    </span>
  );
}

function ValidationStatusBadge({ status }: { status: string }) {
  const classes =
    status === "passed"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
      : status === "failed"
        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";

  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

function LogLevelBadge({ level }: { level: string }) {
  const classes =
    level === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : level === "error"
        ? "text-red-700 dark:text-red-300"
        : level === "warn"
          ? "text-amber-700 dark:text-amber-300"
          : "text-slate-500 dark:text-slate-400";

  return <span className={classes}>{level}</span>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

function groupValidations(validations: CodexValidationResult[]) {
  const groups = new Map<CodexValidationResult["type"], CodexValidationResult[]>();

  for (const validation of validations) {
    groups.set(validation.type, [...(groups.get(validation.type) ?? []), validation]);
  }

  return Array.from(groups.entries()).map(([type, items]) => ({ type, validations: items }));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function highlightPatch(patch: string) {
  return patch
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return `+ ${line.slice(1)}`;
      }

      if (line.startsWith("-") && !line.startsWith("---")) {
        return `- ${line.slice(1)}`;
      }

      return line;
    })
    .join("\n");
}
