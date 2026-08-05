import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { assertPathBelongsToProject, assertProjectPath, sanitizeProjectFolderName } from "@/lib/project-boundary";
import { getProjectsRoot, scanProjectCandidate } from "@/lib/project-scanner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectNameValue = formData.get("projectName");
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (typeof projectNameValue !== "string" || !projectNameValue.trim()) {
      return NextResponse.json({ ok: false, message: "프로젝트 폴더명을 확인하세요." }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ ok: false, message: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    const projectsRoot = getProjectsRoot();
    const projectName = sanitizeProjectFolderName(projectNameValue);
    const projectPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, projectName));

    await mkdir(projectPath, { recursive: true });

    for (const file of files) {
      const relativePath = normalizeUploadedRelativePath(file.name);
      const targetPath = assertPathBelongsToProject(projectPath, path.join(projectPath, relativePath));
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, Buffer.from(await file.arrayBuffer()));
    }

    const project = await scanProjectCandidate(projectPath);

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          message: "파일은 복사했지만 프로젝트 감지 파일을 찾지 못했습니다. README.md, package.json, requirements.txt 등을 확인하세요."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      result: {
        projectName: project.name,
        projectPath,
        source: "upload",
        action: "uploaded",
        message: "프로젝트 폴더를 업로드했습니다."
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "프로젝트 업로드에 실패했습니다."
      },
      { status: 400 }
    );
  }
}

export function normalizeUploadedRelativePath(fileName: string) {
  const parts = fileName
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");

  if (parts.length > 1) {
    parts.shift();
  }

  if (parts.length === 0) {
    throw new Error("업로드 파일 경로를 확인할 수 없습니다.");
  }

  return parts.join("/");
}
