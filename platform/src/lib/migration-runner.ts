import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const nodeBinPath = "C:\\Program Files\\nodejs";

export type MigrationRunResult = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export function getNpxCommand() {
  const windowsNpx = path.join(nodeBinPath, "npx.cmd");

  if (process.platform === "win32" && existsSync(windowsNpx)) {
    return windowsNpx;
  }

  return "npx";
}

export function buildMigrationPathEnv(currentPath = "") {
  if (process.platform !== "win32") {
    return currentPath;
  }

  return currentPath.includes(nodeBinPath) ? currentPath : `${nodeBinPath};${currentPath}`;
}

export function sanitizeCommandOutput(output: string, secrets: string[]) {
  return secrets.reduce((current, secret) => {
    if (!secret) {
      return current;
    }

    return current.split(secret).join("********");
  }, output);
}

export async function runPrismaMigration({
  databaseUrl,
  password,
  migrationName
}: {
  databaseUrl: string;
  password: string;
  migrationName: string;
}): Promise<MigrationRunResult> {
  const npxCommand = getNpxCommand();
  const args = ["prisma", "migrate", "dev", "--name", migrationName, "--skip-generate"];
  const command = `${npxCommand} ${args.join(" ")}`;

  try {
    const result = await execFileAsync(npxCommand, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        Path: buildMigrationPathEnv(process.env.Path ?? process.env.PATH ?? "")
      },
      timeout: 120_000,
      windowsHide: true
    });

    return {
      command,
      exitCode: 0,
      stdout: sanitizeCommandOutput(result.stdout, [databaseUrl, password]),
      stderr: sanitizeCommandOutput(result.stderr, [databaseUrl, password])
    };
  } catch (error) {
    const failure = error as Error & {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    return {
      command,
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      stdout: sanitizeCommandOutput(failure.stdout ?? "", [databaseUrl, password]),
      stderr: sanitizeCommandOutput(failure.stderr ?? failure.message, [databaseUrl, password])
    };
  }
}
