"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";

import type { ScannedProject } from "@/lib/project-scanner";
import { getServerCommandCandidates } from "@/lib/server-command-candidates";

type ServerStartResponse =
  | {
      ok: true;
      result: {
        projectName: string;
        command: string;
        executedCommand: string;
        pid: number | null;
        urls: string[];
        logPath: string;
        message: string;
      };
    }
  | { ok: false; message: string }
  | null;

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
  const [isStarting, setIsStarting] = useState(false);
  const [serverResult, setServerResult] = useState<ServerStartResponse>(null);

  if (!selectedProject) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        아직 감지된 프로젝트가 없습니다. 프로젝트를 등록하면 실행 후보를 선택해 실제 프로젝트 서버를 띄울 수 있습니다.
      </section>
    );
  }

  function selectProject(projectName: string) {
    setClientSelectedProjectName(projectName);
    setServerResult(null);
  }

  function selectCommand(command: string) {
    setSelectedCommandByProject((current) => ({
      ...current,
      [selectedProject.name]: command
    }));
    setServerResult(null);
  }

  async function startServer() {
    setIsStarting(true);
    setServerResult(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(selectedProject.name)}/server/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: selectedCommand })
      });
      const data = (await response.json()) as ServerStartResponse;
      setServerResult(data);
    } catch (error) {
      setServerResult({ ok: false, message: error instanceof Error ? error.message : "프로젝트 서버 실행에 실패했습니다." });
    } finally {
      setIsStarting(false);
    }
  }

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
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedCommand || isStarting}
          onClick={startServer}
          type="button"
        >
          {isStarting ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          실제 프로젝트 서버 실행
        </button>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedProject.description}</p>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">실제 프로젝트 서버 명령</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">관리툴 서버가 아니라 선택한 프로젝트 폴더에서 실행할 명령입니다.</p>
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
      </section>

      {serverResult && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            serverResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {serverResult.ok ? (
            <div>
              <p className="font-medium">{serverResult.result.message}</p>
              <p className="mt-1 font-mono text-xs">PID: {serverResult.result.pid ?? "확인 중"}</p>
              <p className="mt-1 font-mono text-xs">실행: {serverResult.result.executedCommand}</p>
              <p className="mt-1 truncate font-mono text-xs" title={serverResult.result.logPath}>
                로그: {serverResult.result.logPath}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {serverResult.result.urls.map((url) => (
                  <a
                    key={url}
                    className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
                    href={url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {url}
                    <ExternalLink size={13} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-medium">{serverResult.message}</p>
          )}
        </div>
      )}
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
