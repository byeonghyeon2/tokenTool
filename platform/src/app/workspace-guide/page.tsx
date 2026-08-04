import { AppShell } from "@/components/app-shell";

const steps = [
  "프로젝트 선택",
  "변경 요청 작성",
  "관련 영역 분석",
  "ChatGPT 프롬프트 복사",
  "ChatGPT Plus에 붙여넣기",
  "생성된 Codex 프롬프트 복사",
  "사이트에 붙여넣기",
  "Codex 실행",
  "변경 파일과 테스트 결과 확인",
  "다음 수정 요청 반복"
];

export default function WorkspaceGuidePage() {
  return (
    <AppShell>
      <section className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">사용 방법</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          이 시스템은 선택한 프로젝트의 변경 요청과 관련된 코드만 Codex가 분석하도록 ChatGPT Plus에 전달할 프롬프트를 생성합니다.
          OpenAI API와 ChatGPT 자동 조작은 사용하지 않습니다.
        </p>
        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
