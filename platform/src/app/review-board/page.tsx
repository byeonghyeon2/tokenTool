import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const reviewRoles = [
  {
    name: "구현 담당",
    owner: "Codex",
    status: "진행",
    detail: "화면, API, 실행 기록, 검증 흐름을 구현하고 빌드 통과 여부를 확인합니다."
  },
  {
    name: "기능 QA",
    owner: "Codex + 자동 검증",
    status: "부분 완료",
    detail: "typecheck, lint, test, build와 주요 브라우저 클릭을 확인합니다."
  },
  {
    name: "UI/UX 리뷰",
    owner: "Codex",
    status: "보강 중",
    detail: "문구 밀도, 버튼 반응, 화면 흐름, 깨진 한글을 별도 항목으로 점검합니다."
  },
  {
    name: "보안 점검",
    owner: "규칙 기반",
    status: "부분 완료",
    detail: "명령 실행 확인 문구, expectedCommand 검증, 위험 명령 차단을 확인합니다."
  }
];

const checks = [
  { label: "프로젝트 요약 화면 버튼 반응", ok: true, detail: "검증 세트 실행 패널이 펼쳐지고 확인 문구 입력란이 표시됨" },
  { label: "프로젝트 선택 흐름", ok: true, detail: "링크 기반으로 전환해 클라이언트 이벤트가 늦어도 이동 가능" },
  { label: "문구 밀도", ok: true, detail: "긴 설명을 줄이고 상세 메모는 접힘 영역으로 이동" },
  { label: "사이드바 활성 상태", ok: true, detail: "현재 경로 기준으로 활성 메뉴 표시" },
  { label: "별도 전문 리뷰어", ok: false, detail: "아직 독립 UX/보안/QA 에이전트 리뷰는 없음" }
];

export default function ReviewBoardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Review board</p>
          <div className="mt-1 flex items-center gap-2">
            <ClipboardCheck size={22} className="text-blue-600" aria-hidden />
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">검토 현황</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            이 화면은 어떤 역할이 무엇을 확인했는지, 아직 별도 검토가 필요한 항목이 무엇인지 추적합니다.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {reviewRoles.map((role) => (
            <article key={role.name} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{role.name}</h2>
                <ShieldCheck size={17} className="text-blue-600" aria-hidden />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{role.owner}</p>
              <p className="mt-3 w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{role.status}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{role.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">최근 UI 점검 결과</h2>
          <div className="mt-4 space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                {check.ok ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{check.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
