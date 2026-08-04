import { AlertTriangle, CheckCircle2, ClipboardList, FolderKanban, XCircle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getEnvironmentDiagnostics } from "@/lib/environment-diagnostics";
import { scanProjects, type ScannedProject } from "@/lib/project-scanner";

export default async function ProjectReadinessPage() {
  const [diagnostics, projects] = await Promise.all([getEnvironmentDiagnostics(), scanProjects()]);
  const commandCheck = buildCommandReadiness(projects);
  const environmentChecks = [
    {
      label: "Node.js",
      ok: diagnostics.checks.find((check) => check.name === "Node.js")?.ok ?? false,
      detail: diagnostics.checks.find((check) => check.name === "Node.js")?.output || "Node.js 확인 필요"
    },
    {
      label: "npm",
      ok: diagnostics.checks.find((check) => check.name === "npm")?.ok ?? false,
      detail: diagnostics.checks.find((check) => check.name === "npm")?.output || "npm 확인 필요"
    },
    {
      label: "Git",
      ok: diagnostics.checks.find((check) => check.name === "Git")?.ok ?? false,
      detail: diagnostics.checks.find((check) => check.name === "Git")?.output || "Git 확인 필요"
    },
    {
      label: "Projects root",
      ok: Boolean(diagnostics.projectsRoot),
      detail: diagnostics.projectsRoot
    }
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Project readiness</p>
          <div className="mt-1 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" aria-hidden />
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">프로젝트 추가 준비</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            실제 프로젝트를 넣기 전에 환경, 감지 상태, 실행 명령만 빠르게 확인합니다.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <ReadinessSummaryCard label="감지된 프로젝트" value={`${projects.length}개`} ok={projects.length > 0} />
          <ReadinessSummaryCard label="검증 명령" value={`${commandCheck.ready}/${commandCheck.total}`} ok={commandCheck.ready === commandCheck.total && commandCheck.total > 0} />
          <ReadinessSummaryCard label="실행 모드" value={diagnostics.env.codexCliEnabled ? "codex-cli" : "mock"} ok />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel icon={ClipboardList} title="다음 체크">
            <div className="space-y-3">
              <ChecklistItem ok={environmentChecks.every((item) => item.ok)} label="기본 도구" detail="Node.js, npm, Git 상태 확인" />
              <ChecklistItem ok={projects.length > 0} label="프로젝트 감지" detail="projects 폴더 아래 1단계 폴더 기준" />
              <ChecklistItem ok={commandCheck.ready > 0} label="명령 준비" detail="요약 화면에서 run/lint/typecheck/test/build 수정 가능" />
              <ChecklistItem ok label="실행 기록" detail="실행 결과는 Runs 화면에서 검색 및 확인" />
            </div>
          </Panel>

          <Panel icon={FolderKanban} title="환경 상태">
            <div className="space-y-3">
              {environmentChecks.map((check) => (
                <ChecklistItem key={check.label} ok={check.ok} label={check.label} detail={check.detail} />
              ))}
              <ChecklistItem ok={diagnostics.env.databaseUrlConfigured} label="DATABASE_URL" detail={diagnostics.env.databaseUrlConfigured ? "설정됨" : "설정 필요"} />
            </div>
          </Panel>
        </section>

        <Panel icon={FolderKanban} title="프로젝트별 준비 상태">
          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectReadinessCard key={project.path} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              아직 감지된 프로젝트가 없습니다. 최종 프로젝트는 나중에 `projects` 폴더 아래에 추가하면 됩니다.
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function buildCommandReadiness(projects: ScannedProject[]) {
  const total = projects.length * 4;
  const ready = projects.reduce((count, project) => {
    return count + [project.lintCommand, project.typecheckCommand, project.testCommand, project.buildCommand].filter(Boolean).length;
  }, 0);

  return { total, ready };
}

function ReadinessSummaryCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
        {ok ? <CheckCircle2 size={18} className="text-emerald-600" aria-hidden /> : <AlertTriangle size={18} className="text-amber-600" aria-hidden />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof ClipboardList; title: string; children: React.ReactNode }) {
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

function ChecklistItem({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden /> : <XCircle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-950 dark:text-white">{label}</p>
        <p className="mt-1 break-all text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function ProjectReadinessCard({ project }: { project: ScannedProject }) {
  const commands = [
    ["lint", project.lintCommand],
    ["typecheck", project.typecheckCommand],
    ["test", project.testCommand],
    ["build", project.buildCommand]
  ];

  return (
    <article className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">{project.name}</h3>
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{project.path}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.stack}</p>
        </div>
        <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{project.status}</span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {commands.map(([label, command]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-800 dark:text-slate-100">{command || "명령 없음"}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
