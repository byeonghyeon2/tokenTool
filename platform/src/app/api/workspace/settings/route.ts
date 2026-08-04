import { NextResponse } from "next/server";

import { readStoredWorkspaceSetting, writeStoredWorkspaceSetting } from "@/lib/workspace-files";
import { validateWorkspaceSetting, workspaceSettingSchema } from "@/lib/workspace-settings";

export const runtime = "nodejs";

export async function GET() {
  const setting = await readStoredWorkspaceSetting();

  return NextResponse.json({
    ok: true,
    setting
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = workspaceSettingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Workspace 설정 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const validSetting = validateWorkspaceSetting(parsed.data);
    const saved = await writeStoredWorkspaceSetting({
      ...validSetting,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      message: "Workspace 설정을 저장했습니다.",
      setting: saved
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Workspace 설정 저장에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
