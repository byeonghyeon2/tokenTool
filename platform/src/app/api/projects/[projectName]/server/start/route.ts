import { NextResponse } from "next/server";
import { z } from "zod";

import { startProjectServer } from "@/lib/project-server-runner";

export const runtime = "nodejs";

const startServerSchema = z.object({
  command: z.string().trim().min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ projectName: string }> }) {
  const { projectName } = await params;
  const body = await request.json().catch(() => null);
  const parsed = startServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "실행할 실제 프로젝트 서버 명령어를 선택하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const result = await startProjectServer({
      projectName: decodeURIComponent(projectName),
      command: parsed.data.command
    });

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "프로젝트 서버 실행에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
