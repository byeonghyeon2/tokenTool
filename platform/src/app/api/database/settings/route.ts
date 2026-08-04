import { NextResponse } from "next/server";

import { databaseConnectionSchema } from "@/lib/database-settings";
import { readStoredDatabaseSetting, writeStoredDatabaseSetting } from "@/lib/workspace-files";

export const runtime = "nodejs";

export async function GET() {
  const setting = await readStoredDatabaseSetting();

  return NextResponse.json({
    ok: true,
    setting
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = databaseConnectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const saved = await writeStoredDatabaseSetting({
    host: parsed.data.host,
    port: parsed.data.port,
    databaseName: parsed.data.databaseName,
    username: parsed.data.username,
    sslEnabled: parsed.data.sslEnabled,
    additionalOptions: parsed.data.additionalOptions,
    credentialStorageType: "not_stored",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({
    ok: true,
    message: "접속 설정을 저장했습니다. 비밀번호는 저장하지 않았습니다.",
    setting: saved
  });
}
