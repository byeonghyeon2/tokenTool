import { NextResponse } from "next/server";

import { getCodexRun } from "@/lib/run-history";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getCodexRun(runId);

  if (!run) {
    return NextResponse.json(
      {
        ok: false,
        message: "실행 결과를 찾지 못했습니다."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    run
  });
}
