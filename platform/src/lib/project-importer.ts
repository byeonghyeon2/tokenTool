import { execFile } from "child_process";
import { access, mkdir } from "fs/promises";
import path from "path";
import { promisify } from "util";

import { assertProjectPath, sanitizeProjectFolderName } from "./project-boundary";
import { getProjectsRoot, scanProjectCandidate } from "./project-scanner";

const execFileAsync = promisify(execFile);

export type ProjectImportResult = {
  projectName: string;
  projectPath: string;
  source: "github" | "manual" | "upload";
  action?: "cloned" | "pulled" | "registered" | "uploaded";
  message: string;
};

export async function registerExistingProject(projectName: string): Promise<ProjectImportResult> {
  const projectsRoot = getProjectsRoot();
  const safeProjectName = sanitizeProjectFolderName(projectName);
  const projectPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, safeProjectName));
  const project = await scanProjectCandidate(projectPath);

  if (!project) {
    throw new Error("Project marker files were not found under PROJECTS_ROOT.");
  }

  return {
    projectName: project.name,
    projectPath,
    source: "manual",
    action: "registered",
    message: "Manual project registered."
  };
}

export async function importGithubProject({
  repoUrl,
  projectName
}: {
  repoUrl: string;
  projectName?: string;
}): Promise<ProjectImportResult> {
  const projectsRoot = getProjectsRoot();
  const normalizedUrl = normalizeGithubUrl(repoUrl);
  const targetName = sanitizeProjectFolderName(projectName || inferRepositoryName(normalizedUrl));
  const targetPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, targetName));

  await mkdir(projectsRoot, { recursive: true });
  const alreadyExists = await pathExists(targetPath);

  if (alreadyExists) {
    await ensureGitRepository(targetPath);
    await execFileAsync("git", ["-C", targetPath, "pull", "--ff-only"], {
      timeout: 300_000,
      windowsHide: true,
      maxBuffer: 512_000
    });
  } else {
    await execFileAsync("git", ["clone", "--depth", "1", normalizedUrl, targetPath], {
      timeout: 300_000,
      windowsHide: true,
      maxBuffer: 512_000
    });
  }

  const project = await scanProjectCandidate(targetPath);

  if (!project) {
    throw new Error("Repository was cloned, but project marker files were not found.");
  }

  return {
    projectName: project.name,
    projectPath: targetPath,
    source: "github",
    action: alreadyExists ? "pulled" : "cloned",
    message: alreadyExists ? "GitHub project updated." : "GitHub project imported."
  };
}

export function normalizeGithubUrl(repoUrl: string) {
  const trimmed = repoUrl.trim().replace(/\.git$/, "");

  if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/i.test(trimmed)) {
    throw new Error("GitHub URL must use https://github.com/owner/repository format.");
  }

  return `${trimmed}.git`;
}

function inferRepositoryName(repoUrl: string) {
  return repoUrl.replace(/\.git$/, "").split("/").pop() || "github-project";
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureGitRepository(projectPath: string) {
  if (!(await pathExists(path.join(projectPath, ".git")))) {
    throw new Error("Target folder already exists but is not a Git repository.");
  }
}
