import { NextResponse } from "next/server";

import { ensureProjectSummary, getProjectSummary, updateProjectSummary } from "@/lib/project-scanner";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ projectName: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectName } = await params;

  try {
    const result = await getProjectSummary(projectName);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return summaryError(error, "프로젝트 요약 조회에 실패했습니다.");
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { projectName } = await params;

  try {
    const result = await ensureProjectSummary(projectName);

    return NextResponse.json({
      ok: true,
      message: "프로젝트 요약을 생성했습니다.",
      ...result
    });
  } catch (error) {
    return summaryError(error, "프로젝트 요약 생성에 실패했습니다.");
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { projectName } = await params;

  try {
    const body = await request.json();
    const result = await updateProjectSummary(projectName, body);

    return NextResponse.json({
      ok: true,
      message: "프로젝트 요약을 저장했습니다.",
      ...result
    });
  } catch (error) {
    return summaryError(error, "프로젝트 요약 저장에 실패했습니다.");
  }
}

function summaryError(error: unknown, fallback: string) {
  return NextResponse.json(
    {
      ok: false,
      message: error instanceof Error ? error.message : fallback
    },
    { status: 400 }
  );
}
