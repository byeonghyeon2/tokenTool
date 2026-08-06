import { access, mkdir, writeFile } from "fs/promises";
import path from "path";

import { getProjectsRoot, isPathInside, scanProjectCandidate } from "./project-scanner";
import { getServerCommandCandidates } from "./server-command-candidates";

export type ProjectServerRunPlan = {
  script: string;
  displayCommand: string;
};

export type ProjectServerStartResult = {
  projectName: string;
  command: string;
  executedCommand: string;
  executedScript: string;
  pid: number | null;
  urls: string[];
  logPath: string;
  message: string;
};

export async function startProjectServer({
  projectName,
  command
}: {
  projectName: string;
  command: string;
}): Promise<ProjectServerStartResult> {
  const projectsRoot = getProjectsRoot();
  const projectPath = path.resolve(projectsRoot, projectName);

  if (!isPathInside(projectsRoot, projectPath)) {
    throw new Error("등록된 프로젝트만 실행할 수 있습니다.");
  }

  const project = await scanProjectCandidate(projectPath);

  if (!project) {
    throw new Error("프로젝트 정보를 찾을 수 없습니다.");
  }

  const allowedCommands = getServerCommandCandidates(project);
  const selectedCommand = command.trim();

  if (!selectedCommand) {
    throw new Error("실행할 명령을 선택하세요.");
  }

  if (!allowedCommands.includes(selectedCommand)) {
    throw new Error("화면에 표시된 실행 후보만 실행할 수 있습니다.");
  }

  const runPlan = await buildRunPlan(projectPath, selectedCommand);
  const logPath = await createLogPath(project.name);
  const errorLogPath = logPath.replace(/\.log$/i, ".err.log");
  const scriptPath = logPath.replace(/\.log$/i, ".ps1");
  const executedScript = formatDisplayedRunScript(projectPath, runPlan.script);

  await writeFile(scriptPath, executedScript, "utf8");
  await writeFile(errorLogPath, "자동 실행은 관리툴 안정화 단계에서 보류되었습니다.\n", "utf8");

  return {
    projectName: project.name,
    command: selectedCommand,
    executedCommand: runPlan.displayCommand,
    executedScript,
    pid: null,
    urls: inferAccessUrls(runPlan.displayCommand, project.stack),
    logPath,
    message: "자동 실행은 보류되었습니다. 화면에 표시된 스크립트를 수동으로 실행하세요."
  };
}

export function buildStartProcessLauncher({
  projectPath,
  scriptPath,
  logPath,
  errorLogPath
}: {
  projectPath: string;
  scriptPath: string;
  logPath: string;
  errorLogPath: string;
}) {
  return [
    "$Process = Start-Process",
    "-FilePath 'powershell.exe'",
    `-ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ${quotePowerShellPath(scriptPath)})`,
    `-WorkingDirectory ${quotePowerShellPath(projectPath)}`,
    `-RedirectStandardOutput ${quotePowerShellPath(logPath)}`,
    `-RedirectStandardError ${quotePowerShellPath(errorLogPath)}`,
    "-WindowStyle Hidden",
    "-PassThru",
    "; $Process.Id"
  ].join(" ");
}

export async function buildRunPlan(projectPath: string, selectedCommand: string): Promise<ProjectServerRunPlan> {
  const isUvicorn = /\buvicorn\b/i.test(selectedCommand);

  if (!isUvicorn) {
    return {
      script: ["$ErrorActionPreference = 'Stop'", selectedCommand].join("\n"),
      displayCommand: selectedCommand
    };
  }

  const hasRequirements = await fileExists(path.join(projectPath, "requirements.txt"));
  const setupCommands = [
    "$ErrorActionPreference = 'Stop'",
    "if ((Test-Path '.env') -eq $false -and (Test-Path '.env.example')) { Copy-Item '.env.example' '.env' }"
  ];

  if (hasRequirements) {
    setupCommands.push("$PythonExe = 'python'");
    setupCommands.push("if ((Test-Path '.venv\\Scripts\\python.exe') -eq $false) { python -m venv .venv }");
    setupCommands.push("if (Test-Path '.venv\\Scripts\\python.exe') { $PythonExe = '.\\.venv\\Scripts\\python.exe' }");
    setupCommands.push("$ErrorActionPreference = 'Continue'");
    setupCommands.push("& $PythonExe -m pip --version *> $null");
    setupCommands.push("$PipExitCode = $LASTEXITCODE");
    setupCommands.push("$ErrorActionPreference = 'Stop'");
    setupCommands.push("if ($PipExitCode -ne 0) { $PythonExe = 'python' }");
    setupCommands.push("$ErrorActionPreference = 'Continue'");
    setupCommands.push("& $PythonExe -m pip show uvicorn *> $null");
    setupCommands.push("$UvicornExitCode = $LASTEXITCODE");
    setupCommands.push("$ErrorActionPreference = 'Stop'");
    setupCommands.push("if ($UvicornExitCode -ne 0) { & $PythonExe -m pip install -r requirements.txt }");
  }

  const displayCommand = toPythonModuleUvicornCommand(selectedCommand, "python");
  const scriptCommand = toPythonModuleUvicornCommand(selectedCommand, hasRequirements ? "$PythonExe" : "python");

  return {
    script: [...setupCommands, scriptCommand].join("\n"),
    displayCommand
  };
}

export function formatDisplayedRunScript(projectPath: string, script: string) {
  return [`Set-Location -LiteralPath ${quotePowerShellPath(projectPath)}`, ...script.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean)].join("\n");
}

function quotePowerShellPath(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function toPythonModuleUvicornCommand(command: string, pythonExecutable: string) {
  const trimmed = command.trim();
  const normalized = trimmed.replace(/^python\s+-m\s+/i, "");
  const uvicornPart = normalized.toLowerCase().startsWith("uvicorn ") ? normalized : trimmed;
  const pythonPrefix = pythonExecutable.startsWith("$") ? `& ${pythonExecutable} -m ` : `${pythonExecutable} -m `;
  const commandWithPython = uvicornPart.toLowerCase().startsWith("uvicorn ") ? `${pythonPrefix}${uvicornPart}` : trimmed;
  const commandWithHost = /(?:--host|host=)\s*=?\s*[^\s]+/i.test(commandWithPython)
    ? commandWithPython
    : `${commandWithPython} --host 127.0.0.1`;

  return /(?:--port|port=)\s*=?\s*\d{3,5}/i.test(commandWithHost) ? commandWithHost : `${commandWithHost} --port 8000`;
}

async function createLogPath(projectName: string) {
  const logsDir = path.join(process.cwd(), "workspace-data", "server-logs");
  const safeName = projectName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await mkdir(logsDir, { recursive: true });

  return path.join(logsDir, `${safeName}-${stamp}.log`);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function inferAccessUrls(command: string, stack: string) {
  const text = `${command} ${stack}`.toLowerCase();
  const urls = new Set<string>();
  const explicitPort = text.match(/(?:--port|port=|-p)\s*=?\s*(\d{3,5})/)?.[1];
  const explicitHost = text.match(/(?:--host|host=)\s*=?\s*([^\s]+)/)?.[1]?.replace(/^['"]|['"]$/g, "");
  const host = explicitHost && explicitHost !== "0.0.0.0" ? explicitHost : "127.0.0.1";

  if (explicitPort) {
    urls.add(`http://${host}:${explicitPort}`);
  }

  if (text.includes("vite")) urls.add(`http://${host}:5173`);
  if (text.includes("next")) urls.add(`http://${host}:3000`);
  if (text.includes("uvicorn") || text.includes("fastapi") || text.includes("python")) urls.add(`http://${host}:8000`);
  if (text.includes("spring") || text.includes("java") || text.includes("gradle") || text.includes("mvn")) urls.add(`http://${host}:8080`);

  if (urls.size === 0) {
    urls.add(`http://${host}:3000`);
  }

  return Array.from(urls);
}
