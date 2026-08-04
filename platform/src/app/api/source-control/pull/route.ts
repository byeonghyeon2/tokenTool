import { NextResponse } from "next/server";

import { pullManagementSource } from "@/lib/management-source-control";

export const runtime = "nodejs";

export async function POST() {
  const result = await pullManagementSource();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400
  });
}
