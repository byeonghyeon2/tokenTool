import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { readStoredDatabaseSetting } from "@/lib/workspace-files";

export const runtime = "nodejs";

const prismaDir = path.resolve(process.cwd(), "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const migrationsDir = path.join(prismaDir, "migrations");

export async function GET() {
  const setting = await readStoredDatabaseSetting();
  const schema = await readFile(schemaPath, "utf8");
  const provider = schema.match(/provider\s*=\s*"([^"]+)"/)?.[1] ?? "unknown";
  const migrations = existsSync(migrationsDir) ? await readdir(migrationsDir) : [];
  const createDatabaseSql = setting
    ? `CREATE DATABASE \`${setting.databaseName.replaceAll("`", "``")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    : "";

  return NextResponse.json({
    ok: true,
    provider,
    schemaPath,
    migrationsDir,
    migrations,
    hasStoredSetting: Boolean(setting),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    createDatabaseSql,
    commands: [
      "npx prisma generate",
      "npx prisma migrate status",
      "npx prisma migrate dev --name init"
    ],
    notes: [
      "이 API는 읽기 전용 상태 조회입니다.",
      "파괴적인 migration reset은 자동 실행하지 않습니다.",
      "마이그레이션 실행은 사용자 확인 후 별도 단계에서만 수행합니다."
    ]
  });
}
