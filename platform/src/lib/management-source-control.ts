import { existsSync } from "fs";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const owner = "byeonghyeon2";
const repo = "tokenTool";
const branch = "main";
const repositoryUrl = `https://github.com/${owner}/${repo}.git`;
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

export type SourceControlStatus = {
  workspaceRoot: string;
  branch: string;
  commit: string;
  remoteUrl: string;
  upstream: string;
  isGitRepository: boolean;
  workingTreeClean: boolean;
  changes: string[];
  tokenConfigured: boolean;
  proxyConfigured: boolean;
  sslBackend: string;
  commitReady: boolean;
  pullReady: boolean;
  pushReady: boolean;
  notes: string[];
};

export type SourceControlOperationResult = {
  ok: boolean;
  message: string;
  branch: string;
  remoteUrl: string;
  output: string;
};

type GitHubRef = {
  object: {
    sha: string;
  };
};

type GitHubCommit = {
  tree: {
    sha: string;
  };
};

type GitHubTree = {
  sha: string;
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
  }>;
};

type GitHubBlob = {
  content: string;
  encoding: string;
};

type LocalFile = {
  absolutePath: string;
  relativePath: string;
};

export async function getSourceControlStatus(): Promise<SourceControlStatus> {
  const workspaceRoot = getWorkspaceRoot();
  const tokenConfigured = Boolean(await readGithubToken(workspaceRoot));
  const proxyConfigured = Boolean(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY);
  const isGitRepository = existsSync(path.join(workspaceRoot, ".git"));
  const localFiles = await collectLocalSourceFiles(workspaceRoot);
  const remoteHead = tokenConfigured ? await getRemoteHead(workspaceRoot).catch(() => "") : "";
  const notes: string[] = [];

  if (!tokenConfigured) {
    notes.push("루트 .env에 GITHUB_TOKEN이 없습니다.");
  }

  if (proxyConfigured) {
    notes.push("HTTP_PROXY/HTTPS_PROXY/ALL_PROXY가 설정되어 있어 GitHub API 요청 시 제거합니다.");
  }

  if (!isGitRepository) {
    notes.push("로컬 .git이 없어도 GitHub API push/pull은 가능합니다. 단, 로컬 Git 이력 확인은 제한됩니다.");
  }

  notes.push("이 화면은 로컬 git 명령을 실행하지 않고 GitHub API로 push/pull합니다.");

  return {
    workspaceRoot,
    branch,
    commit: remoteHead || "remote 확인 전",
    remoteUrl: repositoryUrl,
    upstream: `origin/${branch}`,
    isGitRepository,
    workingTreeClean: true,
    changes: [`관리툴 업로드 대상 파일 ${localFiles.length}개`],
    tokenConfigured,
    proxyConfigured,
    sslBackend: "GitHub API 사용",
    commitReady: false,
    pullReady: tokenConfigured,
    pushReady: tokenConfigured,
    notes
  };
}

export async function commitManagementSource(message: string): Promise<SourceControlOperationResult> {
  return pushManagementSource(message);
}

export async function pullManagementSource(): Promise<SourceControlOperationResult> {
  const workspaceRoot = getWorkspaceRoot();
  const token = await readGithubToken(workspaceRoot);

  if (!token) {
    return failure("GITHUB_TOKEN이 없습니다. 루트 .env에 GITHUB_TOKEN=... 형태로 넣어주세요.");
  }

  const ref = await githubRequest<GitHubRef>(`/git/ref/heads/${branch}`, token);
  const commit = await githubRequest<GitHubCommit>(`/git/commits/${ref.object.sha}`, token);
  const tree = await githubRequest<GitHubTree>(`/git/trees/${commit.tree.sha}?recursive=1`, token);
  let written = 0;

  for (const item of tree.tree) {
    if (item.type !== "blob" || !isManagedSourcePath(item.path)) {
      continue;
    }

    const blob = await githubRequest<GitHubBlob>(`/git/blobs/${item.sha}`, token);
    const content = Buffer.from(blob.content.replace(/\s+/g, ""), "base64");
    const targetPath = path.join(workspaceRoot, item.path);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content);
    written += 1;
  }

  return {
    ok: true,
    message: "GitHub 원격 소스를 로컬 관리툴에 반영했습니다.",
    branch,
    remoteUrl: repositoryUrl,
    output: `내려받은 파일 ${written}개, 원격 커밋 ${ref.object.sha.slice(0, 7)}`
  };
}

export async function pushManagementSource(message = "Update management tool source"): Promise<SourceControlOperationResult> {
  const workspaceRoot = getWorkspaceRoot();
  const token = await readGithubToken(workspaceRoot);

  if (!token) {
    return failure("GITHUB_TOKEN이 없습니다. 루트 .env에 GITHUB_TOKEN=... 형태로 넣어주세요.");
  }

  const files = await collectLocalSourceFiles(workspaceRoot);

  if (files.length === 0) {
    return failure("업로드할 관리툴 소스 파일이 없습니다.");
  }

  const currentRef = await getRemoteRef(token);
  const baseCommit = currentRef ? await githubRequest<GitHubCommit>(`/git/commits/${currentRef.object.sha}`, token) : null;
  const tree = [];

  for (const file of files) {
    const content = await readFile(file.absolutePath);
    const blob = await githubRequest<{ sha: string }>("/git/blobs", token, {
      method: "POST",
      body: JSON.stringify({
        content: content.toString("base64"),
        encoding: "base64"
      })
    });

    tree.push({
      path: file.relativePath,
      mode: "100644",
      type: "blob",
      sha: blob.sha
    });
  }

  const newTree = await githubRequest<{ sha: string }>("/git/trees", token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit?.tree.sha,
      tree
    })
  });

  const newCommit = await githubRequest<{ sha: string }>("/git/commits", token, {
    method: "POST",
    body: JSON.stringify({
      message: message.trim() || "Update management tool source",
      tree: newTree.sha,
      parents: currentRef ? [currentRef.object.sha] : []
    })
  });

  if (currentRef) {
    await githubRequest(`/git/refs/heads/${branch}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false
      })
    });
  } else {
    await githubRequest("/git/refs", token, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommit.sha
      })
    });
  }

  return {
    ok: true,
    message: "관리툴 소스를 GitHub에 반영했습니다.",
    branch,
    remoteUrl: repositoryUrl,
    output: `업로드 파일 ${files.length}개, 생성 커밋 ${newCommit.sha.slice(0, 7)}`
  };
}

function getWorkspaceRoot() {
  return path.resolve(process.cwd(), "..");
}

async function readGithubToken(workspaceRoot: string) {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN.trim();
  }

  const envPath = path.join(workspaceRoot, ".env");

  try {
    const content = await readFile(envPath, "utf8");
    const line = content
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find((value) => value.startsWith("GITHUB_TOKEN="));

    if (!line) {
      return "";
    }

    return line.replace(/^GITHUB_TOKEN=/, "").replace(/^["']|["']$/g, "").trim();
  } catch {
    return "";
  }
}

async function getRemoteHead(workspaceRoot: string) {
  const token = await readGithubToken(workspaceRoot);
  const ref = await getRemoteRef(token);
  return ref?.object.sha.slice(0, 7) ?? "";
}

async function getRemoteRef(token: string) {
  try {
    return await githubRequest<GitHubRef>(`/git/ref/heads/${branch}`, token);
  } catch {
    return null;
  }
}

async function collectLocalSourceFiles(workspaceRoot: string) {
  const files: LocalFile[] = [];

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toGitPath(path.relative(workspaceRoot, absolutePath));

      if (!isManagedSourcePath(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileStat = await stat(absolutePath);

      if (fileStat.size > 2_000_000) {
        continue;
      }

      files.push({
        absolutePath,
        relativePath
      });
    }
  }

  await walk(workspaceRoot);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function isManagedSourcePath(relativePath: string) {
  const normalized = toGitPath(relativePath);

  if (!normalized || normalized.startsWith("../")) {
    return false;
  }

  if (
    normalized === ".env" ||
    normalized.startsWith(".env.") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith("workspace-data/") ||
    normalized.startsWith("platform/workspace-data/") ||
    normalized.startsWith("platform/node_modules/") ||
    normalized.startsWith("platform/.next/") ||
    normalized.startsWith("platform/coverage/") ||
    normalized.startsWith("platform/dist/") ||
    normalized.startsWith("platform/build/") ||
    normalized.endsWith(".tsbuildinfo") ||
    normalized.endsWith(".log")
  ) {
    return false;
  }

  if (normalized.startsWith("projects/") && normalized !== "projects/.gitkeep") {
    return false;
  }

  return true;
}

async function githubRequest<T>(endpoint: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${sanitizeGitOutput(body)}`);
  }

  return (await response.json()) as T;
}

function failure(message: string): SourceControlOperationResult {
  return {
    ok: false,
    message,
    branch,
    remoteUrl: repositoryUrl,
    output: ""
  };
}

function toGitPath(value: string) {
  return value.replace(/\\/g, "/");
}

function sanitizeGitOutput(output: string) {
  return output.replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_***").replace(/Bearer\s+[A-Za-z0-9_]+/g, "Bearer ***").trim();
}
