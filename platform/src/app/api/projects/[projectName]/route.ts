import { rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { assertProjectPath } from "@/lib/project-boundary";
import { getProjectsRoot } from "@/lib/project-scanner";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectName: string }> }) {
  const { projectName } = await params;

  try {
    const projectsRoot = getProjectsRoot();
    const projectPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, decodeURIComponent(projectName)));

    await rm(projectPath, { recursive: true, force: true });

    return NextResponse.json({
      ok: true,
      message: "프로젝트를 삭제했습니다.",
      projectName,
      projectPath
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
