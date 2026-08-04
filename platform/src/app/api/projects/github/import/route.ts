import { NextResponse } from "next/server";
import { z } from "zod";

import { importGithubProject } from "@/lib/project-importer";

export const runtime = "nodejs";

const githubImportSchema = z.object({
  repoUrl: z.string().trim().url(),
  projectName: z.string().trim().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = githubImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "GitHub 저장소 URL을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const result = await importGithubProject(parsed.data);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "GitHub 프로젝트 가져오기에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
