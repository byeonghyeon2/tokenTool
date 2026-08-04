import { NextResponse } from "next/server";
import { z } from "zod";

import { registerExistingProject } from "@/lib/project-importer";

export const runtime = "nodejs";

const registerProjectSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^<>:"|?*\\/]+$/, "프로젝트명에는 경로 구분자나 Windows 금지 문자를 사용할 수 없습니다.")
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "프로젝트 등록 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const result = await registerExistingProject(parsed.data.projectName);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "프로젝트 등록에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
