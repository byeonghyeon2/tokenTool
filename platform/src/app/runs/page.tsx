import { AppShell } from "@/components/app-shell";
import { RunsExplorer } from "@/components/runs-explorer";
import { listCodexRuns } from "@/lib/run-history";

export default async function RunsPage() {
  const runs = await listCodexRuns();

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Run history</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">작업 기록</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            `workspace-data/runs`에 저장된 Codex 실행과 프로젝트 명령 실행 결과를 최신순으로 보여줍니다.
          </p>
        </section>

        <RunsExplorer runs={runs} />
      </div>
    </AppShell>
  );
}
