import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";

import { getProjectsRoot, isPathInside, scanProjectCandidate } from "./project-scanner";
import { getServerCommandCandidates } from "./server-command-candidates";

export type ProjectServerStartResult = {
  projectName: string;
  command: string;
  executedCommand: string;
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
    throw new Error("프로젝트 정보를 찾지 못했습니다.");
  }

  const allowedCommands = getServerCommandCandidates(project);
  const selectedCommand = command.trim();

  if (!selectedCommand) {
    throw new Error("실행할 명령어를 선택하세요.");
  }

  if (!allowedCommands.includes(selectedCommand)) {
    throw new Error("화면에 표시된 실행 후보만 실행할 수 있습니다.");
  }

  const runPlan = await buildRunPlan(projectPath, selectedCommand);
  const logPath = await createLogPath(project.name);
  const logStream = createWriteStream(logPath, { flags: "a" });
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", runPlan.script], {
    cwd: projectPath,
    detached: true,
    stdio: ["ignore", logStream, logStream],
    windowsHide: true,
    env: {
      ...process.env,
      Path: `C:\\Program Files\\nodejs;${process.env.Path || ""}`
    }
  });

  child.unref();

  return {
    projectName: project.name,
    command: selectedCommand,
    executedCommand: runPlan.displayCommand,
    pid: child.pid ?? null,
    urls: inferAccessUrls(runPlan.displayCommand, project.stack),
    logPath,
    message: "선택한 실제 프로젝트 서버 실행을 시작했습니다."
  };
}

async function buildRunPlan(projectPath: string, selectedCommand: string) {
  const isUvicorn = /\buvicorn\b/i.test(selectedCommand);

  if (!isUvicorn) {
    return {
      script: `$ErrorActionPreference = 'Stop'; ${selectedCommand}`,
      displayCommand: selectedCommand
    };
  }

  const hasRequirements = await fileExists(path.join(projectPath, "requirements.txt"));
  const setupCommands = [
    "$ErrorActionPreference = 'Stop'",
    "if ((Test-Path '.env') -eq $false -and (Test-Path '.env.example')) { Copy-Item '.env.example' '.env' }"
  ];

  if (hasRequirements) {
    setupCommands.push("if ((Test-Path '.venv\\Scripts\\python.exe') -eq $false) { python -m venv .venv }");
    setupCommands.push(".\\.venv\\Scripts\\python.exe -m pip show uvicorn *> $null; if ($LASTEXITCODE -ne 0) { .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt }");
  }

  const displayCommand = toPythonModuleUvicornCommand(selectedCommand, hasRequirements);

  return {
    script: [...setupCommands, displayCommand].join("; "),
    displayCommand
  };
}

function toPythonModuleUvicornCommand(command: string, useVenv: boolean) {
  const trimmed = command.trim();
  const normalized = trimmed.replace(/^python\s+-m\s+/i, "");
  const uvicornPart = normalized.toLowerCase().startsWith("uvicorn ") ? normalized : trimmed;
  const pythonPrefix = useVenv ? ".\\.venv\\Scripts\\python.exe -m " : "python -m ";
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

  if (text.includes("vite")) {
    urls.add(`http://${host}:5173`);
  }

  if (text.includes("next")) {
    urls.add(`http://${host}:3000`);
  }

  if (text.includes("uvicorn") || text.includes("fastapi")) {
    urls.add(`http://${host}:8000`);
  }

  if (text.includes("python")) {
    urls.add(`http://${host}:8000`);
  }

  if (text.includes("spring") || text.includes("java") || text.includes("gradle") || text.includes("mvn")) {
    urls.add(`http://${host}:8080`);
  }

  if (urls.size === 0) {
    urls.add(`http://${host}:3000`);
  }

  return Array.from(urls);
}
