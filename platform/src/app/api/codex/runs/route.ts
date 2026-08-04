import { NextResponse } from "next/server";
import { z } from "zod";

import { runCodex } from "@/lib/codex-runner";
import { listCodexRuns } from "@/lib/run-history";

export const runtime = "nodejs";

const runCodexSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^<>:"|?*\\/]+$/, "프로젝트명에는 경로 구분자나 Windows 금지 문자를 사용할 수 없습니다."),
  promptPath: z.string().trim().min(1),
  provider: z.enum(["mock", "codex-cli"]).optional(),
  confirmation: z.string().optional()
});

export async function GET() {
  const runs = await listCodexRuns();

  return NextResponse.json({
    ok: true,
    runs
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = runCodexSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Codex 실행 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const run = await runCodex(parsed.data);

    return NextResponse.json({
      ok: run.status === "completed",
      run
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Codex 실행에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
