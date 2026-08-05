import { FileCode2, ShieldCheck, TerminalSquare } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { ProjectImportActions } from "@/components/project-import-actions";
import { getProjectsRoot, scanProjects } from "@/lib/project-scanner";

const homeSteps = [
  {
    title: "프로젝트 추가",
    body: "폴더 업로드나 GitHub clone/pull로 관리툴의 projects/ 하위에 프로젝트를 둡니다.",
    icon: ShieldCheck
  },
  {
    title: "수정 요청 정리",
    body: "선택한 프로젝트의 Markdown 문서와 요청 내용을 합쳐 ChatGPT 분석 프롬프트를 만듭니다.",
    icon: FileCode2
  },
  {
    title: "Codex 반복",
    body: "ChatGPT가 만든 실행 프롬프트를 Codex에 붙여넣고 수정, 커밋, 재분석 흐름을 반복합니다.",
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
            관리툴은 실제 프로젝트를 수정하지 않고, 선택한 프로젝트의 문서와 Git 상태만 읽어 프롬프트 생성을 돕습니다.
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">관리 대상: projects/ 하위 프로젝트</p>
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
                <p className="mt-2 leading-6">프로젝트 추가를 열고 폴더 업로드 또는 GitHub clone/pull로 등록하세요.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
