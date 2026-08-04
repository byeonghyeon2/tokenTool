import { NextResponse } from "next/server";

import { getSourceControlStatus } from "@/lib/management-source-control";

export const runtime = "nodejs";

export async function GET() {
  const status = await getSourceControlStatus();

  return NextResponse.json({
    ok: true,
    status
  });
}
