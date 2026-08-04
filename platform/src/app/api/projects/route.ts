import { NextResponse } from "next/server";

import { getProjectsRoot, scanProjects } from "@/lib/project-scanner";

export const runtime = "nodejs";

export async function GET() {
  const projects = await scanProjects();

  return NextResponse.json({
    ok: true,
    projectsRoot: getProjectsRoot(),
    projects
  });
}
