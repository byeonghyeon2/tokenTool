import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMarkdownAnalysisPrompt } from "@/lib/markdown-prompt";

export const runtime = "nodejs";

const generatePromptSchema = z.object({
  projectName: z.string().trim().min(1),
  changeRequest: z.string().trim().min(5)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generatePromptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "프로젝트명과 수정 요청을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const prompt = await generateMarkdownAnalysisPrompt(parsed.data);

    return NextResponse.json({
      ok: true,
      prompt
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Markdown 분석 프롬프트 생성에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
