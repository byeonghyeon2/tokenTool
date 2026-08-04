import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

import {
  buildDatabaseUrl,
  databaseConnectionSchema,
  maskDatabaseUrl,
  sanitizeDatabaseError
} from "@/lib/database-settings";

export const runtime = "nodejs";

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

  const databaseUrl = buildDatabaseUrl(parsed.data);

  try {
    const connection = await mysql.createConnection({
      uri: databaseUrl,
      connectTimeout: 5000
    });

    const [rows] = await connection.query("SELECT VERSION() AS version");
    await connection.end();

    const version = Array.isArray(rows) && rows[0] && "version" in rows[0] ? String(rows[0].version) : "unknown";

    return NextResponse.json({
      ok: true,
      message: "MySQL 연결에 성공했습니다.",
      maskedDatabaseUrl: maskDatabaseUrl(databaseUrl),
      version
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "MySQL 연결에 실패했습니다.",
        error: sanitizeDatabaseError(error),
        maskedDatabaseUrl: maskDatabaseUrl(databaseUrl)
      },
      { status: 200 }
    );
  }
}
