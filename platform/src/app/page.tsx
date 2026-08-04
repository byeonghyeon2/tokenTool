import { FileCode2, ShieldCheck, TerminalSquare } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { ProjectImportActions } from "@/components/project-import-actions";
import { getProjectsRoot, scanProjects } from "@/lib/project-scanner";

const homeSteps = [
  {
    title: "프로젝트 등록",
    body: "복사한 폴더, 업로드한 폴더, GitHub 저장소를 PROJECTS_ROOT 아래에 연결합니다.",
    icon: ShieldCheck
  },
  {
    title: "수정 요청 정리",
    body: "선택한 프로젝트의 .md와 변경 요청만 조합해 ChatGPT 분석 프롬프트를 만듭니다.",
    icon: FileCode2
  },
  {
    title: "Codex 반복",
    body: "ChatGPT 결과를 Codex에 붙여넣고 수정, 커밋, pull 후 다시 분석합니다.",
    icon: TerminalSquare
  }
];

export default async function Home() {
  const projects = await scanProjects();

  return (
    <AppShell>
      <main className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">프로젝트별 Codex 작업 관리</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            관리툴은 프로젝트를 직접 섞어 읽지 않고, 선택한 하나의 프로젝트 문서와 Git 상태만 분석합니다.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-3">
            {homeSteps.map((step) => (
              <div key={step.title} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                  <step.icon size={18} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">프로젝트 목록</h2>
            <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500" title={getProjectsRoot()}>
              {getProjectsRoot()}
            </p>
          </div>

          <ProjectImportActions projectsRoot={getProjectsRoot()} />

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard key={project.path} {...project} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-white">아직 감지된 프로젝트가 없습니다.</p>
                <p className="mt-2 leading-6">프로젝트 추가를 열고 복사, 업로드, GitHub 중 하나로 등록하세요.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
