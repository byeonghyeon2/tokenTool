import { ArrowRight, GitBranch, History, RefreshCw } from "lucide-react";
import Link from "next/link";

import { ProjectDeleteButton } from "./project-delete-button";

export type ProjectCardProps = {
  name: string;
  description: string;
  stack: string;
  path: string;
  branch: string;
  changes: number;
  lastAnalyzedAt: string;
  status: string;
  markers?: string[];
};

export function ProjectCard(project: ProjectCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">{project.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description}</p>
          <p className="mt-2 truncate text-[11px] text-slate-400 dark:text-slate-500" title={project.path}>
            {project.path}
          </p>
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          href={`/project-summary?project=${encodeURIComponent(project.name)}`}
        >
          열기
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{project.stack}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
          <GitBranch size={13} aria-hidden />
          {project.branch}
        </span>
        <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          {project.status}
        </span>
        <span>변경 {project.changes}개</span>
        <span>마지막 분석 {project.lastAnalyzedAt}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {project.markers?.slice(0, 4).map((marker) => (
          <span key={marker} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {marker}
          </span>
        ))}
        <Link
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          href={`/project-summary?project=${encodeURIComponent(project.name)}`}
        >
          <RefreshCw size={13} aria-hidden />
          다시 분석
        </Link>
        <Link
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          href="/runs"
        >
          <History size={13} aria-hidden />
          작업 기록
        </Link>
        <ProjectDeleteButton projectName={project.name} />
      </div>
    </article>
  );
}
