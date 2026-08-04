import { CheckCircle2, MonitorCog, XCircle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getEnvironmentDiagnostics } from "@/lib/environment-diagnostics";

export default async function DiagnosticsPage() {
  const diagnostics = await getEnvironmentDiagnostics();

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">System diagnostics</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">환경 진단</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            실제 Codex CLI 실행 전에 Node.js, npm, Git, MySQL CLI, Codex CLI 상태와 관련 환경변수를 확인합니다.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <InfoCard label="현재 작업 경로" value={diagnostics.cwd} />
          <InfoCard label="프로젝트 루트" value={diagnostics.projectsRoot} />
          <InfoCard label="Node.js 설치 경로" value={diagnostics.nodePathExists ? "C:\\Program Files\\nodejs 감지됨" : "감지 안 됨"} />
          <InfoCard label="생성 시각" value={formatDate(diagnostics.generatedAt)} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <MonitorCog size={18} className="text-blue-600" aria-hidden />
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Codex 실행 설정</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <EnvItem label="CODEX_PROVIDER" value={diagnostics.env.codeProvider} />
            <EnvItem label="CODEX_COMMAND" value={diagnostics.env.codexCommand} />
            <EnvItem label="CODEX_ARGS_JSON" value={diagnostics.env.codexArgsJson} />
            <EnvItem label="CODEX_TIMEOUT_MS" value={diagnostics.env.codexTimeoutMs} />
            <EnvItem label="CODEX_CLI_ENABLED" value={diagnostics.env.codexCliEnabled ? "true" : "false"} />
            <EnvItem label="DATABASE_URL" value={diagnostics.env.databaseUrlConfigured ? "설정됨" : "비어 있음"} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">명령 확인</h2>
          <div className="mt-4 space-y-3">
            {diagnostics.checks.map((check) => (
              <article key={check.name} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {check.ok ? (
                        <CheckCircle2 size={17} className="text-emerald-600" aria-hidden />
                      ) : (
                        <XCircle size={17} className="text-red-600" aria-hidden />
                      )}
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{check.name}</h3>
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">{check.command}</p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      check.ok
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
                    }`}
                  >
                    {check.ok ? "정상" : "확인 필요"}
                  </span>
                </div>
                {check.output && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{check.output}</p>}
                {check.error && <p className="mt-2 break-all text-xs text-red-700 dark:text-red-300">{check.error}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function EnvItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-900 dark:text-slate-100">{value}</p>
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
