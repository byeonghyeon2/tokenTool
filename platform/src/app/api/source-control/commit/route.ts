import { NextResponse } from "next/server";
import { z } from "zod";

import { commitManagementSource } from "@/lib/management-source-control";

export const runtime = "nodejs";

const commitSchema = z.object({
  message: z.string().trim().min(1).max(200)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = commitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "커밋 메시지를 입력하세요.",
        branch: "",
        remoteUrl: "",
        output: parsed.error.flatten().formErrors.join("\n")
      },
      { status: 400 }
    );
  }

  const result = await commitManagementSource(parsed.data.message);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400
  });
}
