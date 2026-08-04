import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeChangeRequest } from "@/lib/change-analysis";
import { getProjectsRoot, isPathInside, scanProjectCandidate } from "@/lib/project-scanner";

export const runtime = "nodejs";

const analyzeRequestSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^<>:"|?*\\/]+$/, "프로젝트명에는 경로 구분자나 Windows 금지 문자를 사용할 수 없습니다."),
  request: z.string().trim().min(5, "변경 요청을 조금 더 구체적으로 입력하세요.")
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "변경 요청 분석 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const projectsRoot = getProjectsRoot();
  const workspaceRoot = path.resolve(process.cwd(), "..");
  const projectPath = path.resolve(projectsRoot, parsed.data.projectName);

  if (!isPathInside(projectsRoot, projectPath)) {
    return NextResponse.json(
      {
        ok: false,
        message: "PROJECTS_ROOT 밖의 프로젝트는 분석할 수 없습니다."
      },
      { status: 400 }
    );
  }

  const project = await scanProjectCandidate(projectPath);

  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        message: "프로젝트 감지 기준 파일을 찾지 못했습니다."
      },
      { status: 404 }
    );
  }

  const analysis = await analyzeChangeRequest({
    projectName: parsed.data.projectName,
    projectPath,
    request: parsed.data.request,
    workspaceRoot
  });

  return NextResponse.json({
    ok: true,
    analysis
  });
}
