import { NextResponse } from "next/server";

import { runProjectCommand, runProjectCommandSet, type ProjectCommandType } from "@/lib/project-command-runner";

export const runtime = "nodejs";

const commandTypes = new Set<ProjectCommandType>(["run", "lint", "typecheck", "test", "build"]);

export async function POST(request: Request, { params }: { params: Promise<{ projectName: string }> }) {
  const { projectName } = await params;
  const form = await request.formData();
  const confirmation = textValue(form.get("confirmation"));

  try {
    const commandSet = textValue(form.get("commandSet"));
    const origin = new URL(request.url).origin;

    if (commandSet === "standard-validation") {
      const run = await runProjectCommandSet({
        projectName,
        setType: "standard-validation",
        confirmation,
        expectedCommands: {
          lint: textValue(form.get("expectedLintCommand")),
          typecheck: textValue(form.get("expectedTypecheckCommand")),
          test: textValue(form.get("expectedTestCommand")),
          build: textValue(form.get("expectedBuildCommand"))
        }
      });

      return NextResponse.redirect(`${origin}/runs/${run.id}`, { status: 303 });
    }

    const commandType = textValue(form.get("commandType")) as ProjectCommandType;

    if (!commandTypes.has(commandType)) {
      throw new Error("실행할 명령 종류가 올바르지 않습니다.");
    }

    const run = await runProjectCommand({
      projectName,
      commandType,
      confirmation,
      expectedCommand: textValue(form.get("expectedCommand"))
    });

    return NextResponse.redirect(`${origin}/runs/${run.id}`, { status: 303 });
  } catch (error) {
    const origin = new URL(request.url).origin;
    const message = encodeURIComponent(error instanceof Error ? error.message : "프로젝트 명령 실행에 실패했습니다.");
    return NextResponse.redirect(`${origin}/project-summary?project=${encodeURIComponent(projectName)}&error=${message}`, { status: 303 });
  }
}

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
