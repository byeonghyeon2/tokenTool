import { NextResponse } from "next/server";
import { z } from "zod";

import { stopCodexRun } from "@/lib/codex-runner";

export const runtime = "nodejs";

const stopRunSchema = z.object({
  runId: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = stopRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "중단 요청 입력값을 확인하세요."
      },
      { status: 400 }
    );
  }

  const result = await stopCodexRun(parsed.data.runId);

  return NextResponse.json(result);
}
