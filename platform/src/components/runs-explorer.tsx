"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileDiff, ListChecks, ScrollText, Search, XCircle } from "lucide-react";

import type { CodexRunSummary } from "@/lib/run-history";

type StatusFilter = "all" | "completed" | "failed" | "blocked";

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체", value: "all" },
  { label: "성공", value: "completed" },
  { label: "실패", value: "failed" },
  { label: "차단", value: "blocked" }
];

export function RunsExplorer({ runs }: { runs: CodexRunSummary[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return runs.filter((run) => {
      const matchesStatus = statusFilter === "all" || run.status === statusFilter;
      const searchableText = [
        run.id,
        run.provider,
        run.projectName,
        run.status,
        run.summary,
        run.savedPath,
        ...run.validationTypes,
        ...run.validationCommands
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, runs, statusFilter]);

  if (runs.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-medium text-slate-900 dark:text-white">아직 저장된 실행 기록이 없습니다.</p>
        <p className="mt-2 leading-6">Codex mock 실행이나 프로젝트 명령 실행을 하면 이 화면에 기록이 표시됩니다.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="프로젝트, 명령, 상태, run id 검색"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                className={`h-10 rounded-lg px-3 text-sm font-medium ${
                  statusFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                onClick={() => setStatusFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {filteredRuns.length}개 표시 / 전체 {runs.length}개
        </p>
      </div>

      {filteredRuns.length > 0 ? (
        <div className="space-y-4">
          {filteredRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          조건에 맞는 실행 기록이 없습니다.
        </div>
      )}
    </section>
  );
}

function RunCard({ run }: { run: CodexRunSummary }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {run.provider}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              exit {run.exitCode}
            </span>
            {run.validationTypes.map((type) => (
              <span key={type} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                {type}
              </span>
            ))}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{run.projectName}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{run.summary}</p>
        </div>
        <div className="text-left text-xs text-slate-500 dark:text-slate-400 md:text-right">
          <p>{formatDate(run.finishedAt)}</p>
          <p className="mt-1 break-all font-mono">{run.id}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-3">
        <Metric icon={ScrollText} label="로그" value={`${run.logCount}개`} />
        <Metric icon={FileDiff} label="파일 변경" value={`${run.fileChangeCount}개`} />
        <Metric icon={ListChecks} label="검증" value={`${run.validationCount}개`} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          {run.savedPath}
        </p>
        <Link
          href={`/runs/${run.id}`}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          상세 보기
        </Link>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed";
  const isFailed = status === "failed" || status === "blocked";
  const Icon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock3;
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

function Metric({ icon: Icon, label, value }: { icon: typeof ScrollText; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <Icon size={17} className="text-blue-600" aria-hidden />
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
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
