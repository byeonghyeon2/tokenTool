import { NextResponse } from "next/server";

import { runProjectCommand, runProjectCommandSet, type ProjectCommandSetType, type ProjectCommandType } from "@/lib/project-command-runner";

export const runtime = "nodejs";

const allowedCommandTypes = new Set<ProjectCommandType>(["run", "lint", "typecheck", "test", "build"]);
const allowedCommandSets = new Set<ProjectCommandSetType>(["standard-validation"]);

export async function POST(request: Request, { params }: { params: Promise<{ projectName: string }> }) {
  const { projectName } = await params;

  try {
    const body = (await request.json()) as {
      commandType?: ProjectCommandType;
      commandSet?: ProjectCommandSetType;
      confirmation?: string;
      expectedCommand?: string;
      expectedCommands?: Partial<Record<ProjectCommandType, string>>;
    };

    if (body.commandSet) {
      if (!allowedCommandSets.has(body.commandSet)) {
        return NextResponse.json(
          {
            ok: false,
            message: "실행할 명령 세트가 올바르지 않습니다."
          },
          { status: 400 }
        );
      }

      const run = await runProjectCommandSet({
        projectName,
        setType: body.commandSet,
        confirmation: body.confirmation,
        expectedCommands: body.expectedCommands
      });

      return NextResponse.json({
        ok: true,
        run
      });
    }

    if (!body.commandType || !allowedCommandTypes.has(body.commandType)) {
      return NextResponse.json(
        {
          ok: false,
          message: "실행할 명령 종류가 올바르지 않습니다."
        },
        { status: 400 }
      );
    }

    const run = await runProjectCommand({
      projectName,
      commandType: body.commandType,
      confirmation: body.confirmation,
      expectedCommand: body.expectedCommand
    });

    return NextResponse.json({
      ok: true,
      run
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "프로젝트 명령 실행에 실패했습니다."
      },
      { status: 400 }
    );
  }
}
