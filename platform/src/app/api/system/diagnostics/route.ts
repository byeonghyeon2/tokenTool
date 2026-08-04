import { NextResponse } from "next/server";

import { getEnvironmentDiagnostics } from "@/lib/environment-diagnostics";

export const runtime = "nodejs";

export async function GET() {
  const diagnostics = await getEnvironmentDiagnostics();

  return NextResponse.json({
    ok: true,
    diagnostics
  });
}
