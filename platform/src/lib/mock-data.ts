import { CheckCircle2, Clock3, FileCode2, ShieldCheck, TerminalSquare } from "lucide-react";

export const workflowSteps = ["프로젝트 업로드", "수정 요청 분석", "ChatGPT 프롬프트", "결과 붙여넣기", "Codex 실행", "기록 확인"];

export const analysisCards = [
  {
    title: "1. 프로젝트 업로드",
    body: "로컬 폴더를 선택하거나 GitHub 저장소 주소로 프로젝트를 가져올 준비를 합니다.",
    icon: ShieldCheck
  },
  {
    title: "2. 수정 내용 분석",
    body: "수정 요청과 관련된 파일만 읽기 전용으로 확인해 필요한 맥락을 줄입니다.",
    icon: FileCode2
  },
  {
    title: "3. ChatGPT 왕복으로 토큰 절약",
    body: "프로젝트 전체를 보내지 않고 정리된 프롬프트만 ChatGPT에 전달해 토큰 사용을 줄입니다.",
    icon: TerminalSquare
  }
];

export const runEvents = [
  { level: "info", text: "프로젝트별 작업 범위를 먼저 고정합니다.", icon: Clock3 },
  { level: "success", text: "관련 파일만 분석해 ChatGPT 프롬프트를 만듭니다.", icon: CheckCircle2 },
  { level: "info", text: "결과와 검증 로그는 작업 기록에서 다시 확인합니다.", icon: FileCode2 }
];
