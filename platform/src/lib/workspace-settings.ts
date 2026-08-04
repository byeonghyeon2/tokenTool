import path from "path";
import { z } from "zod";

export const workspaceSettingSchema = z.object({
  workspaceRoot: z.string().trim().min(1),
  projectsRoot: z.string().trim().min(1),
  codexCommand: z.string().trim().min(1),
  codexArgsJson: z.string().trim().default("[]"),
  codexCliEnabled: z.boolean().default(false),
  codexTimeoutMs: z.coerce.number().int().min(1_000).max(3_600_000)
});

export type WorkspaceSettingInput = z.infer<typeof workspaceSettingSchema>;

export function validateWorkspaceSetting(input: WorkspaceSettingInput) {
  const workspaceRoot = path.resolve(input.workspaceRoot);
  const projectsRoot = path.resolve(input.projectsRoot);
  const relativeProjectsPath = path.relative(workspaceRoot, projectsRoot);

  if (relativeProjectsPath.startsWith("..") || path.isAbsolute(relativeProjectsPath)) {
    throw new Error("PROJECTS_ROOT는 WORKSPACE_ROOT 내부여야 합니다.");
  }

  parseCodexArgsJson(input.codexArgsJson);

  return {
    ...input,
    workspaceRoot,
    projectsRoot
  };
}

export function parseCodexArgsJson(value: string) {
  const parsed = JSON.parse(value || "[]") as unknown;

  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("CODEX_ARGS_JSON은 문자열 배열 JSON이어야 합니다.");
  }

  return parsed;
}
