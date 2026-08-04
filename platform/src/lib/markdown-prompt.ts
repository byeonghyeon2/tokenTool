import { execFile } from "child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

import { assertPathBelongsToProject, assertProjectPath, shouldIgnoreProjectDirectory, toProjectRelativePath } from "./project-boundary";
import { getProjectsRoot, scanProjectCandidate } from "./project-scanner";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(process.cwd(), "..");
const runsRoot = path.join(workspaceRoot, "workspace-data", "runs");
const maxMarkdownFiles = 12;
const maxMarkdownChars = 3000;
const maxTotalMarkdownChars = 18000;

export type MarkdownPromptResult = {
  content: string;
  savedPath: string;
  createdAt: string;
  markdownFiles: Array<{ path: string; chars: number }>;
};

export async function generateMarkdownAnalysisPrompt({
  projectName,
  changeRequest
}: {
  projectName: string;
  changeRequest: string;
}): Promise<MarkdownPromptResult> {
  const projectsRoot = getProjectsRoot();
  const projectPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, projectName));
  const scannedProject = await scanProjectCandidate(projectPath);

  if (!scannedProject) {
    throw new Error("Project was not found under PROJECTS_ROOT.");
  }

  const markdownFiles = await collectMarkdownFiles(projectPath);
  const gitDiffStat = await runGit(projectPath, ["diff", "--stat"]);
  const gitStatus = scannedProject.git.changedFiles.map((file) => `- ${file.status} ${file.path}`).join("\n") || "- No changed files";
  const gitGraph = scannedProject.git.graph.length > 0 ? scannedProject.git.graph.join("\n") : "- No commit graph";
  const markdownSection =
    markdownFiles.length > 0 ? markdownFiles.map((file) => `## ${file.relativePath}\n\n${file.content}`).join("\n\n---\n\n") : "No Markdown files were found in the selected project.";
  const content = buildPrompt({
    projectName: scannedProject.name,
    projectPath: scannedProject.path,
    stack: scannedProject.stack,
    branch: scannedProject.branch,
    changeRequest,
    gitStatus,
    gitDiffStat: gitDiffStat.trim() || "- No diff stat",
    gitGraph,
    markdownSection
  });
  const createdAt = new Date().toISOString();
  const savedPath = path.join(runsRoot, `chatgpt-md-analysis-${safeName(projectName)}-${Date.now()}.md`);

  await mkdir(runsRoot, { recursive: true });
  await writeFile(savedPath, content, "utf8");

  return {
    content,
    savedPath,
    createdAt,
    markdownFiles: markdownFiles.map((file) => ({ path: file.relativePath, chars: file.originalLength }))
  };
}

function buildPrompt({
  projectName,
  projectPath,
  stack,
  branch,
  changeRequest,
  gitStatus,
  gitDiffStat,
  gitGraph,
  markdownSection
}: {
  projectName: string;
  projectPath: string;
  stack: string;
  branch: string;
  changeRequest: string;
  gitStatus: string;
  gitDiffStat: string;
  gitGraph: string;
  markdownSection: string;
}) {
  return `# ChatGPT Project Analysis Request

## Role
You are a senior software analyst who creates precise Codex execution prompts.

## Goal
Analyze only the selected project context below. Use the Markdown documents, git summary, and user request to produce a final prompt that the user can paste into Codex.

## Project Boundary Rules
- Analyze only this project: ${projectName}
- Treat this path as the selected project root: ${projectPath}
- Do not infer details from other projects.
- If the documents do not prove something, mark it as "needs confirmation".
- The final Codex prompt must mention the files, sequence, risks, and validation commands.

## Project Info
- Name: ${projectName}
- Path: ${projectPath}
- Stack: ${stack}
- Branch: ${branch}

## User Change Request
${changeRequest}

## Git Status
${gitStatus}

## Git Diff Stat
${gitDiffStat}

## Recent Commit Graph
\`\`\`text
${gitGraph}
\`\`\`

## Selected Project Markdown
${markdownSection}

## Required Output
Write the result in this exact structure:

### 1. Project Understanding
- What this project does
- Key structure inferred from Markdown

### 2. Change Request Interpretation
- What the user wants
- Likely affected areas

### 3. Needs Confirmation
- Unknowns that are not proven by the supplied files

### 4. Codex Execution Strategy
- Files to inspect or edit
- Implementation order
- Risks
- Validation commands

### 5. Final Codex Prompt
Write a complete prompt that can be pasted into Codex.
`;
}

export async function collectMarkdownFiles(projectPath: string) {
  const found: Array<{ absolutePath: string; relativePath: string }> = [];

  await walkProjectMarkdown(projectPath, projectPath, found);

  const prioritized = found
    .sort((a, b) => scoreMarkdown(a.relativePath) - scoreMarkdown(b.relativePath) || a.relativePath.localeCompare(b.relativePath))
    .slice(0, maxMarkdownFiles);

  const result: Array<{ relativePath: string; content: string; originalLength: number }> = [];
  let totalChars = 0;

  for (const file of prioritized) {
    const safePath = assertPathBelongsToProject(projectPath, file.absolutePath);
    const rawContent = await readFile(safePath, "utf8").catch(() => "");
    const trimmedContent = rawContent.trim();
    const compact = trimmedContent.slice(0, Math.min(maxMarkdownChars, Math.max(0, maxTotalMarkdownChars - totalChars)));

    if (!compact) {
      continue;
    }

    totalChars += compact.length;
    result.push({
      relativePath: file.relativePath,
      content: compact.length < trimmedContent.length ? `${compact}\n\n[Document truncated by management tool.]` : compact,
      originalLength: rawContent.length
    });

    if (totalChars >= maxTotalMarkdownChars) {
      break;
    }
  }

  return result;
}

async function walkProjectMarkdown(projectPath: string, currentPath: string, found: Array<{ absolutePath: string; relativePath: string }>) {
  const safeCurrentPath = assertPathBelongsToProject(projectPath, currentPath);
  const entries = await readdir(safeCurrentPath, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (entry.isDirectory() && shouldIgnoreProjectDirectory(entry.name)) {
      continue;
    }

    const absolutePath = assertPathBelongsToProject(projectPath, path.join(safeCurrentPath, entry.name));

    if (entry.isDirectory()) {
      await walkProjectMarkdown(projectPath, absolutePath, found);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const fileStat = await stat(absolutePath).catch(() => null);

    if (!fileStat || fileStat.size > 300_000) {
      continue;
    }

    found.push({
      absolutePath,
      relativePath: toProjectRelativePath(projectPath, absolutePath)
    });
  }
}

function scoreMarkdown(relativePath: string) {
  const lower = relativePath.toLowerCase();

  if (lower === "readme.md") return 0;
  if (lower.includes("requirement")) return 1;
  if (lower.includes("spec")) return 2;
  if (lower.startsWith("docs/") || lower.startsWith("doc/")) return 3;
  if (lower.includes("changelog")) return 4;

  return 10;
}

async function runGit(projectPath: string, args: string[]) {
  try {
    const safeProjectPath = assertPathBelongsToProject(projectPath, projectPath);
    const { stdout } = await execFileAsync("git", ["-C", safeProjectPath, ...args], {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 256_000
    });

    return stdout;
  } catch {
    return "";
  }
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "project";
}
