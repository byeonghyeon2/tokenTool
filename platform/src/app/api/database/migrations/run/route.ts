import { NextResponse } from "next/server";
import { z } from "zod";

import { buildDatabaseUrl, databaseConnectionSchema } from "@/lib/database-settings";
import { runPrismaMigration } from "@/lib/migration-runner";

export const runtime = "nodejs";

const migrationRunSchema = databaseConnectionSchema.extend({
  migrationName: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-zA-Z0-9_-]+$/, "마이그레이션 이름은 영문, 숫자, _, - 만 사용할 수 있습니다."),
  confirmation: z.literal("RUN_MIGRATION")
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = migrationRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "마이그레이션 실행 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const databaseUrl = buildDatabaseUrl(parsed.data);
  const result = await runPrismaMigration({
    databaseUrl,
    password: parsed.data.password,
    migrationName: parsed.data.migrationName
  });

  return NextResponse.json({
    ok: result.exitCode === 0,
    message: result.exitCode === 0 ? "Prisma migration 실행이 완료되었습니다." : "Prisma migration 실행에 실패했습니다.",
    ...result
  });
}
