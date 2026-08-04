import { NextResponse } from "next/server";

import { pushManagementSource } from "@/lib/management-source-control";

export const runtime = "nodejs";

export async function POST() {
  const result = await pushManagementSource();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400
  });
}
