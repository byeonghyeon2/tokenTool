"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Play } from "lucide-react";

import type { ScannedProject } from "@/lib/project-scanner";
import { getServerCommandCandidates } from "@/lib/server-command-candidates";

export function ProjectSummaryEditor({
  projects,
  selectedProjectName,
  hideProjectList = false
}: {
  projects: ScannedProject[];
  selectedProjectName?: string;
  hideProjectList?: boolean;
}) {
  const initialProjectName =
    selectedProjectName && projects.some((project) => project.name === selectedProjectName) ? selectedProjectName : projects[0]?.name ?? "";
  const [clientSelectedProjectName, setClientSelectedProjectName] = useState(initialProjectName);
  const selectedProject = useMemo(
    () => projects.find((project) => project.name === clientSelectedProjectName) ?? projects[0],
    [projects, clientSelectedProjectName]
  );
  const serverCommandCandidates = useMemo(() => (selectedProject ? getServerCommandCandidates(selectedProject) : []), [selectedProject]);
  const [selectedCommandByProject, setSelectedCommandByProject] = useState<Record<string, string>>({});
  const selectedCommand = selectedProject ? selectedCommandByProject[selectedProject.name] ?? serverCommandCandidates[0] ?? "" : "";

  if (!selectedProject) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        아직 감지된 프로젝트가 없습니다. 프로젝트를 등록하면 실행 후보를 확인할 수 있습니다.
      </section>
    );
  }

  function selectProject(projectName: string) {
    setClientSelectedProjectName(projectName);
  }

  function selectCommand(command: string) {
    setSelectedCommandByProject((current) => ({
      ...current,
      [selectedProject.name]: command
    }));
  }

  const previewScript = selectedCommand ? [`Set-Location -LiteralPath '${selectedProject.path.replaceAll("'", "''")}'`, selectedCommand].join("\n") : "";

  const content = (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{selectedProject.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">{selectedProject.stack}</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400" title={selectedProject.path}>
            {selectedProject.path}
          </p>
        </div>

        <button
          className="inline-flex h-10 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-300 px-4 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          disabled
          type="button"
        >
          <Play size={16} aria-hidden />
          서버 실행 보류
        </button>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedProject.description}</p>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">프로젝트 서버 명령</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">관리툴 안정화가 우선이라 자동 실행은 잠시 보류하고, 실행 후보와 스크립트만 표시합니다.</p>
          </div>
          {selectedCommand && <code className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">{selectedCommand}</code>}
        </div>

        {serverCommandCandidates.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {serverCommandCandidates.map((command) => (
              <button
                key={command}
                className={`rounded-lg border px-3 py-2 text-left font-mono text-xs transition ${
                  selectedCommand === command
                    ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                onClick={() => selectCommand(command)}
                type="button"
              >
                {command}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">감지된 서버 실행 후보가 없습니다.</p>
        )}

        {previewScript && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">수동 실행 스크립트</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              <code>{previewScript}</code>
            </pre>
          </div>
        )}
      </section>
    </section>
  );

  if (hideProjectList) {
    return content;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        {projects.map((project) => (
          <Link
            key={project.path}
            href={`/project-summary?project=${encodeURIComponent(project.name)}`}
            className={`block w-full rounded-lg border px-4 py-3 text-left transition ${
              selectedProject.name === project.name
                ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            onClick={() => selectProject(project.name)}
          >
            <span className="block truncate text-sm font-semibold">{project.name}</span>
            <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{project.stack}</span>
          </Link>
        ))}
      </aside>
      {content}
    </div>
  );
}
