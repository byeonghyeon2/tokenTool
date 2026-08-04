import { BookOpen } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MarkdownPromptPanel } from "@/components/markdown-prompt-panel";
import { ProjectSummaryEditor } from "@/components/project-summary-editor";
import { scanProjects } from "@/lib/project-scanner";

export default async function ProjectSummaryPage({
  searchParams
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const projects = await scanProjects();
  const resolvedSearchParams = await searchParams;
  const selectedProjectName = resolvedSearchParams?.project;

  return (
    <AppShell>
      <div className="space-y-5">
        <section>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">프로젝트 작업 공간</p>
          <div className="mt-1 flex items-center gap-2">
            <BookOpen size={22} className="text-blue-600" aria-hidden />
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Markdown 기반 프롬프트 생성</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            위쪽은 선택한 실제 프로젝트의 정보와 서버 실행 명령입니다. 아래쪽은 .md 문서와 수정 요청을 합쳐 ChatGPT에 붙여넣을 분석 프롬프트를 만듭니다.
          </p>
        </section>

        <ProjectSummaryEditor projects={projects} selectedProjectName={selectedProjectName} hideProjectList />
        <MarkdownPromptPanel projects={projects} selectedProjectName={selectedProjectName} />
      </div>
    </AppShell>
  );
}
