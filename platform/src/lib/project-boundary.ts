import path from "path";

export const ignoredProjectDirectories = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", ".venv", ".turbo", ".cache"]);

export function isPathInsideOrEqual(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function isPathInside(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function assertProjectPath(projectsRoot: string, projectPath: string) {
  const resolvedRoot = path.resolve(projectsRoot);
  const resolvedProjectPath = path.resolve(projectPath);

  if (!isPathInside(resolvedRoot, resolvedProjectPath)) {
    throw new Error("프로젝트 경로는 PROJECTS_ROOT 바로 아래에 있어야 합니다.");
  }

  return resolvedProjectPath;
}

export function assertPathBelongsToProject(projectPath: string, candidatePath: string) {
  const resolvedProjectPath = path.resolve(projectPath);
  const resolvedCandidatePath = path.resolve(candidatePath);

  if (!isPathInsideOrEqual(resolvedProjectPath, resolvedCandidatePath)) {
    throw new Error("선택한 프로젝트 밖의 파일에는 접근할 수 없습니다.");
  }

  return resolvedCandidatePath;
}

export function toProjectRelativePath(projectPath: string, candidatePath: string) {
  const safePath = assertPathBelongsToProject(projectPath, candidatePath);
  return path.relative(path.resolve(projectPath), safePath).replaceAll("\\", "/");
}

export function shouldIgnoreProjectDirectory(directoryName: string) {
  return ignoredProjectDirectories.has(directoryName);
}

export function sanitizeProjectFolderName(projectName: string) {
  const sanitized = projectName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (!sanitized) {
    throw new Error("프로젝트 폴더명을 확인하세요.");
  }

  return sanitized;
}
