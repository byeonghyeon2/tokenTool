import { NextResponse } from "next/server";
import { z } from "zod";

import { generateChatGptPrompt } from "@/lib/prompt-workflow";

export const runtime = "nodejs";

const generatePromptSchema = z.object({
  analysisPath: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generatePromptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "분석 결과 경로를 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const prompt = await generateChatGptPrompt(parsed.data.analysisPath);

    return NextResponse.json({
      ok: true,
      prompt
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "ChatGPT 프롬프트 생성에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
