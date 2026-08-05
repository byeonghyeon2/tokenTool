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
  source: "github" | "upload";
  action?: "cloned" | "pulled" | "uploaded";
  message: string;
};

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
    throw new Error("저장소를 가져왔지만 프로젝트 감지 파일을 찾지 못했습니다.");
  }

  return {
    projectName: project.name,
    projectPath: targetPath,
    source: "github",
    action: alreadyExists ? "pulled" : "cloned",
    message: alreadyExists ? "GitHub 프로젝트를 pull로 업데이트했습니다." : "GitHub 프로젝트를 clone했습니다."
  };
}

export function normalizeGithubUrl(repoUrl: string) {
  const trimmed = repoUrl.trim().replace(/\.git$/, "");

  if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/i.test(trimmed)) {
    throw new Error("GitHub URL은 https://github.com/owner/repository 형식이어야 합니다.");
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
    throw new Error("대상 폴더가 이미 있지만 Git 저장소가 아닙니다.");
  }
}
