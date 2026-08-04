import { execFile } from "child_process";
import { access, mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

import { assertPathBelongsToProject, assertProjectPath, isPathInside, shouldIgnoreProjectDirectory, toProjectRelativePath } from "./project-boundary";
import { inferProjectCommands } from "./project-command-inference";

const execFileAsync = promisify(execFile);

export type CommandCandidates = {
  run: string[];
  test: string[];
  build: string[];
  lint: string[];
  typecheck: string[];
};

export type ProjectSummary = {
  name: string;
  description: string;
  stackSummary: string;
  architectureSummary: string;
  projectRules: string[];
  restrictions: string[];
  runCommand: string;
  testCommand: string;
  buildCommand: string;
  lintCommand: string;
  typecheckCommand: string;
  commandCandidates: CommandCandidates;
  lastAnalyzedAt: string;
};

export type ProjectSummaryInput = {
  description?: string;
  stackSummary?: string;
  architectureSummary?: string;
  projectRules?: string[];
  restrictions?: string[];
  runCommand?: string;
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  typecheckCommand?: string;
};

export type GitOverview = {
  isRepository: boolean;
  changedFiles: Array<{ path: string; status: string }>;
  graph: string[];
};

export type ScannedProject = {
  name: string;
  description: string;
  stack: string;
  path: string;
  branch: string;
  changes: number;
  lastAnalyzedAt: string;
  status: string;
  markers: string[];
  runCommand: string;
  testCommand: string;
  buildCommand: string;
  lintCommand: string;
  typecheckCommand: string;
  commandCandidates: CommandCandidates;
  git: GitOverview;
};

export const projectMarkerFiles = [
  ".git",
  "package.json",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "README.md"
];

const workspaceRoot = path.resolve(process.cwd(), "..");
const projectsRoot = process.env.PROJECTS_ROOT ? path.resolve(process.env.PROJECTS_ROOT) : path.join(workspaceRoot, "projects");

export function getProjectsRoot() {
  return projectsRoot;
}

export { isPathInside };

export function inferStackFromMarkers(markers: string[]) {
  const stack = new Set<string>();

  if (markers.includes("package.json")) {
    stack.add("Node.js");
    stack.add("TypeScript/JavaScript");
  }

  if (markers.includes("pom.xml") || markers.includes("build.gradle") || markers.includes("build.gradle.kts")) {
    stack.add("Java");
  }

  if (markers.includes("requirements.txt") || markers.includes("pyproject.toml")) {
    stack.add("Python");
  }

  if (markers.includes("go.mod")) stack.add("Go");
  if (markers.includes("Cargo.toml")) stack.add("Rust");
  if (markers.includes("composer.json")) stack.add("PHP");

  return stack.size > 0 ? Array.from(stack).join(" / ") : "Unknown stack";
}

export async function scanProjects(): Promise<ScannedProject[]> {
  await mkdir(projectsRoot, { recursive: true });

  const entries = await readdir(projectsRoot, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => scanProjectCandidate(path.join(projectsRoot, entry.name)))
  );

  return projects.filter((project): project is ScannedProject => Boolean(project)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function scanProjectCandidate(projectPath: string): Promise<ScannedProject | null> {
  const resolvedProjectPath = path.resolve(projectPath);

  if (!isPathInside(projectsRoot, resolvedProjectPath)) {
    return null;
  }

  const markers = await findProjectMarkers(resolvedProjectPath);

  if (markers.length === 0) {
    return null;
  }

  const name = path.basename(resolvedProjectPath);
  const savedSummary = await readProjectSummaryFile(resolvedProjectPath);
  const branch = await readGitBranch(resolvedProjectPath);
  const git = await readGitOverview(resolvedProjectPath);
  const commandHints = inferProjectCommands(markers);
  const contentRunCandidates = await inferRunCandidatesFromProjectContent(resolvedProjectPath);
  const commandCandidates = mergeCommandCandidates(
    {
      ...commandHints.commandCandidates,
      run: uniqueCommands([...contentRunCandidates, ...commandHints.commandCandidates.run])
    },
    savedSummary.commandCandidates
  );
  const description = savedSummary.description || (await readReadmeDescription(resolvedProjectPath)) || "No project description yet.";

  return {
    name,
    description,
    stack: savedSummary.stackSummary || inferStackFromMarkers(markers),
    path: path.relative(workspaceRoot, resolvedProjectPath),
    branch,
    changes: git.changedFiles.length,
    lastAnalyzedAt: savedSummary.lastAnalyzedAt || "Not analyzed",
    status: savedSummary.lastAnalyzedAt ? "Summary ready" : "Registered candidate",
    markers,
    runCommand: contentRunCandidates[0] ?? savedSummary.runCommand ?? commandHints.runCommand,
    testCommand: savedSummary.testCommand ?? commandHints.testCommand,
    buildCommand: savedSummary.buildCommand ?? commandHints.buildCommand,
    lintCommand: savedSummary.lintCommand ?? commandHints.lintCommand,
    typecheckCommand: savedSummary.typecheckCommand ?? commandHints.typecheckCommand,
    commandCandidates,
    git
  };
}

export async function ensureProjectSummary(projectName: string) {
  const { projectPath, scanned } = await resolveScannedProject(projectName);
  const summary = buildProjectSummary(scanned, await readProjectSummaryFile(projectPath));
  const summaryPath = await writeProjectSummary(projectPath, summary);

  return { summaryPath, summary };
}

export async function getProjectSummary(projectName: string) {
  const { projectPath, scanned } = await resolveScannedProject(projectName);
  const summary = buildProjectSummary(scanned, await readProjectSummaryFile(projectPath));

  return {
    project: scanned,
    summary,
    summaryPath: getProjectSummaryPath(projectPath)
  };
}

export async function updateProjectSummary(projectName: string, input: ProjectSummaryInput) {
  const { projectPath, scanned } = await resolveScannedProject(projectName);
  const current = buildProjectSummary(scanned, await readProjectSummaryFile(projectPath));
  const summary: ProjectSummary = {
    ...current,
    description: cleanText(input.description, current.description),
    stackSummary: cleanText(input.stackSummary, current.stackSummary),
    architectureSummary: cleanText(input.architectureSummary, current.architectureSummary),
    projectRules: cleanTextList(input.projectRules, current.projectRules),
    restrictions: cleanTextList(input.restrictions, current.restrictions),
    runCommand: cleanCommand(input.runCommand, current.runCommand),
    testCommand: cleanCommand(input.testCommand, current.testCommand),
    buildCommand: cleanCommand(input.buildCommand, current.buildCommand),
    lintCommand: cleanCommand(input.lintCommand, current.lintCommand),
    typecheckCommand: cleanCommand(input.typecheckCommand, current.typecheckCommand),
    commandCandidates: mergeCommandCandidates(current.commandCandidates, {
      run: input.runCommand ? [input.runCommand] : [],
      test: input.testCommand ? [input.testCommand] : [],
      build: input.buildCommand ? [input.buildCommand] : [],
      lint: input.lintCommand ? [input.lintCommand] : [],
      typecheck: input.typecheckCommand ? [input.typecheckCommand] : []
    }),
    lastAnalyzedAt: new Date().toISOString()
  };
  const summaryPath = await writeProjectSummary(projectPath, summary);

  return { summaryPath, summary };
}

async function resolveScannedProject(projectName: string) {
  const projectPath = assertProjectPath(projectsRoot, path.resolve(projectsRoot, projectName));
  const scanned = await scanProjectCandidate(projectPath);

  if (!scanned) {
    throw new Error("Project marker files were not found.");
  }

  return { projectPath, scanned };
}

function buildProjectSummary(scanned: ScannedProject, savedSummary: Partial<ProjectSummary>): ProjectSummary {
  return {
    name: scanned.name,
    description: savedSummary.description || scanned.description,
    stackSummary: savedSummary.stackSummary || scanned.stack,
    architectureSummary: savedSummary.architectureSummary || "",
    projectRules: savedSummary.projectRules || [],
    restrictions: savedSummary.restrictions || ["Do not access files outside the selected project root.", "Do not expose sensitive file contents."],
    runCommand: savedSummary.runCommand ?? scanned.runCommand,
    testCommand: savedSummary.testCommand ?? scanned.testCommand,
    buildCommand: savedSummary.buildCommand ?? scanned.buildCommand,
    lintCommand: savedSummary.lintCommand ?? scanned.lintCommand,
    typecheckCommand: savedSummary.typecheckCommand ?? scanned.typecheckCommand,
    commandCandidates: mergeCommandCandidates(scanned.commandCandidates, savedSummary.commandCandidates),
    lastAnalyzedAt: savedSummary.lastAnalyzedAt || new Date().toISOString()
  };
}

function getProjectSummaryPath(projectPath: string) {
  return path.join(projectPath, ".aidev", "project-summary.json");
}

async function writeProjectSummary(projectPath: string, summary: ProjectSummary) {
  const aidevDir = assertPathBelongsToProject(projectPath, path.join(projectPath, ".aidev"));
  const summaryPath = assertPathBelongsToProject(projectPath, getProjectSummaryPath(projectPath));
  await mkdir(aidevDir, { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summaryPath;
}

async function findProjectMarkers(projectPath: string) {
  const results = await Promise.all(
    projectMarkerFiles.map(async (marker) => {
      try {
        await access(assertPathBelongsToProject(projectPath, path.join(projectPath, marker)));
        return marker;
      } catch {
        return null;
      }
    })
  );

  return results.filter((marker): marker is string => Boolean(marker));
}

async function readProjectSummaryFile(projectPath: string): Promise<Partial<ProjectSummary>> {
  try {
    const content = await readFile(assertPathBelongsToProject(projectPath, getProjectSummaryPath(projectPath)), "utf8");
    return JSON.parse(content) as Partial<ProjectSummary>;
  } catch {
    return {};
  }
}

async function readReadmeDescription(projectPath: string) {
  try {
    const readmePath = assertPathBelongsToProject(projectPath, path.join(projectPath, "README.md"));
    const readmeStat = await stat(readmePath);

    if (readmeStat.size > 100_000) {
      return "";
    }

    const content = await readFile(readmePath, "utf8");
    const heading = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));

    return heading?.slice(0, 160) ?? "";
  } catch {
    return "";
  }
}

async function inferRunCandidatesFromProjectContent(projectPath: string) {
  const [requirements, readme, appMain, markdownRunCommands] = await Promise.all([
    readSmallFile(projectPath, path.join(projectPath, "requirements.txt")),
    readSmallFile(projectPath, path.join(projectPath, "README.md")),
    readSmallFile(projectPath, path.join(projectPath, "app", "main.py")),
    readMarkdownRunCommands(projectPath)
  ]);
  const combined = `${requirements}\n${readme}\n${appMain}`.toLowerCase();
  const candidates: string[] = [...markdownRunCommands];
  const readmeCommand = readme.match(/(?:python\s+-m\s+)?uvicorn\s+[\w.]+:app(?:\s+[^\r\n`]+)?/i)?.[0]?.trim();

  if (readmeCommand) {
    candidates.push(normalizeServerCommand(readmeCommand));
  }

  if (combined.includes("fastapi") || combined.includes("uvicorn")) {
    candidates.push("python -m uvicorn app.main:app --host 127.0.0.1 --port 8000");
  }

  return uniqueCommands(candidates);
}

async function readMarkdownRunCommands(projectPath: string) {
  const markdownPaths = await findMarkdownFiles(projectPath);
  const commands: string[] = [];

  for (const markdownPath of markdownPaths.slice(0, 10)) {
    const content = await readSmallFile(projectPath, markdownPath);
    commands.push(...extractRunCommandsFromMarkdown(content));
  }

  return uniqueCommands(commands);
}

async function findMarkdownFiles(projectPath: string) {
  const results: string[] = [];

  async function walk(currentPath: string) {
    const safeCurrentPath = assertPathBelongsToProject(projectPath, currentPath);
    const entries = await readdir(safeCurrentPath, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (entry.isDirectory() && shouldIgnoreProjectDirectory(entry.name)) {
        continue;
      }

      const entryPath = assertPathBelongsToProject(projectPath, path.join(safeCurrentPath, entry.name));

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(entryPath);
      }
    }
  }

  await walk(projectPath);

  return results.sort((a, b) => scoreMarkdownPath(projectPath, a) - scoreMarkdownPath(projectPath, b));
}

function scoreMarkdownPath(projectPath: string, filePath: string) {
  const relativePath = toProjectRelativePath(projectPath, filePath).toLowerCase();

  if (relativePath === "readme.md") return 0;
  if (relativePath.includes("run") || relativePath.includes("start") || relativePath.includes("execute")) return 1;
  if (relativePath.startsWith("docs/")) return 2;

  return 10;
}

function extractRunCommandsFromMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const commands: string[] = [];
  let inRunSection = false;
  let fenceLanguage = "";
  let fenceLines: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/)?.[1]?.toLowerCase() ?? "";

    if (heading) {
      const isSetupSection = /setup|install|config|environment/.test(heading);
      inRunSection = !isSetupSection && /run|start|serve|server|uvicorn|dev server/.test(heading);
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);

    if (fence && !fenceLanguage) {
      fenceLanguage = fence[1]?.toLowerCase() || "text";
      fenceLines = [];
      continue;
    }

    if (fence && fenceLanguage) {
      if (inRunSection && isShellFence(fenceLanguage)) {
        const command = normalizeCommandBlock(fenceLines);

        if (command) {
          commands.push(command);
        }
      }

      fenceLanguage = "";
      fenceLines = [];
      continue;
    }

    if (fenceLanguage) {
      fenceLines.push(line);
    }
  }

  return commands;
}

function isShellFence(language: string) {
  return ["powershell", "pwsh", "shell", "bash", "sh", "zsh", "cmd", "bat", "text"].includes(language);
}

function normalizeCommandBlock(lines: string[]) {
  const commandLines = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"))
    .filter((line) => !line.toLowerCase().startsWith("cd "));

  if (commandLines.length === 0) {
    return "";
  }

  return commandLines.map(normalizeServerCommand).join(" && ");
}

function normalizeServerCommand(command: string) {
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("uvicorn ") && !lower.startsWith("python -m uvicorn ")) {
    return trimmed;
  }

  const withPythonModule = lower.startsWith("python -m uvicorn ") ? trimmed : `python -m ${trimmed}`;
  const withHost = /(?:--host|host=)\s*=?\s*[^\s]+/i.test(withPythonModule) ? withPythonModule : `${withPythonModule} --host 127.0.0.1`;

  return /(?:--port|port=)\s*=?\s*\d{3,5}/i.test(withHost) ? withHost : `${withHost} --port 8000`;
}

async function readSmallFile(projectPath: string, filePath: string) {
  try {
    const safePath = assertPathBelongsToProject(projectPath, filePath);
    const fileStat = await stat(safePath);

    if (!fileStat.isFile() || fileStat.size > 300_000) {
      return "";
    }

    return await readFile(safePath, "utf8");
  } catch {
    return "";
  }
}

async function readGitBranch(projectPath: string) {
  try {
    const head = await readFile(assertPathBelongsToProject(projectPath, path.join(projectPath, ".git", "HEAD")), "utf8");
    const match = head.match(/^ref:\s+refs\/heads\/(.+)$/);
    return match?.[1]?.trim() || "detached";
  } catch {
    return "none";
  }
}

async function readGitOverview(projectPath: string): Promise<GitOverview> {
  try {
    await access(assertPathBelongsToProject(projectPath, path.join(projectPath, ".git")));
  } catch {
    return { isRepository: false, changedFiles: [], graph: [] };
  }

  const [statusOutput, graphOutput] = await Promise.all([
    runGit(projectPath, ["status", "--short"]),
    runGit(projectPath, ["log", "--oneline", "--decorate", "--graph", "-n", "8"])
  ]);

  return {
    isRepository: true,
    changedFiles: parseGitStatus(statusOutput),
    graph: graphOutput
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
  };
}

async function runGit(projectPath: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", projectPath, ...args], {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 256_000
    });

    return stdout;
  } catch {
    return "";
  }
}

function parseGitStatus(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2).trim() || "?",
      path: line.slice(3).trim() || line.trim()
    }));
}

function mergeCommandCandidates(base: CommandCandidates, extra?: Partial<CommandCandidates>) {
  return {
    run: uniqueCommands([...base.run, ...(extra?.run ?? [])]),
    test: uniqueCommands([...base.test, ...(extra?.test ?? [])]),
    build: uniqueCommands([...base.build, ...(extra?.build ?? [])]),
    lint: uniqueCommands([...base.lint, ...(extra?.lint ?? [])]),
    typecheck: uniqueCommands([...base.typecheck, ...(extra?.typecheck ?? [])])
  };
}

function uniqueCommands(commands: string[]) {
  return Array.from(new Set(commands.map((command) => command.trim()).filter(Boolean)));
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim().slice(0, 4000) : fallback;
}

function cleanCommand(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim().slice(0, 300) : fallback;
}

function cleanTextList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}
