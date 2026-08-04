import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type StoredDatabaseSetting = {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  sslEnabled: boolean;
  additionalOptions: string;
  credentialStorageType: "not_stored";
  updatedAt: string;
};

export type StoredWorkspaceSetting = {
  workspaceRoot: string;
  projectsRoot: string;
  codexCommand: string;
  codexArgsJson: string;
  codexCliEnabled: boolean;
  codexTimeoutMs: number;
  updatedAt: string;
};

const workspaceDataRoot = path.resolve(process.cwd(), "..", "workspace-data");
const settingsDir = path.join(workspaceDataRoot, "settings");
const databaseSettingPath = path.join(settingsDir, "database-setting.json");
const workspaceSettingPath = path.join(settingsDir, "workspace-setting.json");

export async function readStoredDatabaseSetting() {
  try {
    const content = await readFile(databaseSettingPath, "utf8");
    return JSON.parse(content) as StoredDatabaseSetting;
  } catch {
    return null;
  }
}

export async function writeStoredDatabaseSetting(setting: StoredDatabaseSetting) {
  await mkdir(settingsDir, { recursive: true });
  await writeFile(databaseSettingPath, `${JSON.stringify(setting, null, 2)}\n`, "utf8");
  return setting;
}

export function getDatabaseSettingPath() {
  return databaseSettingPath;
}

export async function readStoredWorkspaceSetting() {
  try {
    const content = await readFile(workspaceSettingPath, "utf8");
    return JSON.parse(content) as StoredWorkspaceSetting;
  } catch {
    return defaultWorkspaceSetting();
  }
}

export async function writeStoredWorkspaceSetting(setting: StoredWorkspaceSetting) {
  await mkdir(settingsDir, { recursive: true });
  await writeFile(workspaceSettingPath, `${JSON.stringify(setting, null, 2)}\n`, "utf8");
  return setting;
}

export function defaultWorkspaceSetting(): StoredWorkspaceSetting {
  const workspaceRoot = path.resolve(process.cwd(), "..");

  return {
    workspaceRoot,
    projectsRoot: path.join(workspaceRoot, "projects"),
    codexCommand: process.env.CODEX_COMMAND || "codex",
    codexArgsJson: process.env.CODEX_ARGS_JSON || "[]",
    codexCliEnabled: process.env.CODEX_CLI_ENABLED === "true",
    codexTimeoutMs: Number(process.env.CODEX_TIMEOUT_MS || 600_000),
    updatedAt: new Date().toISOString()
  };
}
