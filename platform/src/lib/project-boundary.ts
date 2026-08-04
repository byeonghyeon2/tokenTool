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
    throw new Error("Project path must be a direct workspace project path under PROJECTS_ROOT.");
  }

  return resolvedProjectPath;
}

export function assertPathBelongsToProject(projectPath: string, candidatePath: string) {
  const resolvedProjectPath = path.resolve(projectPath);
  const resolvedCandidatePath = path.resolve(candidatePath);

  if (!isPathInsideOrEqual(resolvedProjectPath, resolvedCandidatePath)) {
    throw new Error("Project file access crossed the selected project boundary.");
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
    throw new Error("Project folder name is empty after sanitizing.");
  }

  return sanitized;
}
