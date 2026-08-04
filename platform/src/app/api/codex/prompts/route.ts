import { NextResponse } from "next/server";
import { z } from "zod";

import { saveCodexPrompt } from "@/lib/prompt-workflow";

export const runtime = "nodejs";

const saveCodexPromptSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^<>:"|?*\\/]+$/, "프로젝트명에는 경로 구분자나 Windows 금지 문자를 사용할 수 없습니다."),
  content: z.string().trim().min(10, "Codex 프롬프트 내용을 입력하세요.")
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = saveCodexPromptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Codex 프롬프트 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const prompt = await saveCodexPrompt(parsed.data);

  return NextResponse.json({
    ok: true,
    message: "Codex 프롬프트를 저장했습니다.",
    prompt
  });
}
