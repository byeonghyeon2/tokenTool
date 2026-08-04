"use client";

import { useMemo, useState } from "react";
import { Database, EyeOff, Loader2, Play, Save, ShieldCheck, X } from "lucide-react";

type FormState = {
  host: string;
  port: string;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled: string;
  additionalOptions: string;
};

type TestResult =
  | {
      ok: boolean;
      message: string;
      error?: string;
      maskedDatabaseUrl?: string;
      version?: string;
    }
  | null;

type SaveResult =
  | {
      ok: boolean;
      message: string;
      setting?: {
        host: string;
        port: number;
        databaseName: string;
        username: string;
        sslEnabled: boolean;
        additionalOptions: string;
        updatedAt: string;
      };
    }
  | null;

type MigrationResult =
  | {
      ok: boolean;
      provider: string;
      migrations: string[];
      hasStoredSetting: boolean;
      hasDatabaseUrl: boolean;
      createDatabaseSql: string;
      commands: string[];
      notes: string[];
    }
  | null;

type MigrationRunResult =
  | {
      ok: boolean;
      message: string;
      command?: string;
      exitCode?: number;
      stdout?: string;
      stderr?: string;
    }
  | null;

const initialForm: FormState = {
  host: "",
  port: "3306",
  databaseName: "",
  username: "",
  password: "",
  sslEnabled: "false",
  additionalOptions: ""
};

export function DatabaseSettingsForm() {
  const [form, setForm] = useState(initialForm);
  const [migrationName, setMigrationName] = useState("init");
  const [confirmation, setConfirmation] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMigration, setIsLoadingMigration] = useState(false);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [saveResult, setSaveResult] = useState<SaveResult>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult>(null);
  const [migrationRunResult, setMigrationRunResult] = useState<MigrationRunResult>(null);

  const canUseDatabaseActions = useMemo(
    () => form.host.trim() && form.port.trim() && form.databaseName.trim() && form.username.trim(),
    [form.databaseName, form.host, form.port, form.username]
  );

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function requestBody() {
    return {
      ...form,
      port: Number(form.port),
      sslEnabled: form.sslEnabled === "true"
    };
  }

  async function testConnection() {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody())
      });
      setTestResult((await response.json()) as TestResult);
    } catch (error) {
      setTestResult({
        ok: false,
        message: "연결 테스트 요청에 실패했습니다.",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function saveSetting() {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch("/api/database/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody())
      });
      setSaveResult((await response.json()) as SaveResult);
    } catch (error) {
      setSaveResult({
        ok: false,
        message: error instanceof Error ? error.message : "설정 저장 요청에 실패했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function loadMigrationStatus() {
    setIsLoadingMigration(true);
    setMigrationResult(null);

    try {
      const response = await fetch("/api/database/migrations");
      setMigrationResult((await response.json()) as MigrationResult);
    } finally {
      setIsLoadingMigration(false);
    }
  }

  async function runMigration() {
    setIsRunningMigration(true);
    setMigrationRunResult(null);

    try {
      const response = await fetch("/api/database/migrations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestBody(),
          migrationName,
          confirmation
        })
      });
      const data = (await response.json()) as MigrationRunResult;
      setMigrationRunResult(data);

      if (data?.ok) {
        setShowMigrationModal(false);
        setConfirmation("");
        await loadMigrationStatus();
      }
    } catch (error) {
      setMigrationRunResult({
        ok: false,
        message: error instanceof Error ? error.message : "마이그레이션 실행 요청에 실패했습니다."
      });
    } finally {
      setIsRunningMigration(false);
    }
  }

  return (
    <section className="max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">MySQL 설정</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            실제 접속 정보는 사용자가 직접 입력합니다. 비밀번호는 저장하지 않고 연결 테스트와 migration 실행 시에만 사용합니다.
          </p>
        </div>
        <Database className="text-blue-600" size={24} aria-hidden />
      </div>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <TextField label="호스트" name="host" value={form.host} onChange={updateField} placeholder="localhost" />
        <TextField label="포트" name="port" value={form.port} onChange={updateField} placeholder="3306" />
        <TextField label="데이터베이스명" name="databaseName" value={form.databaseName} onChange={updateField} />
        <TextField label="사용자명" name="username" value={form.username} onChange={updateField} />
        <TextField label="비밀번호" name="password" value={form.password} onChange={updateField} type="password" />
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="ssl">
          SSL 사용
          <select
            id="ssl"
            value={form.sslEnabled}
            onChange={(event) => updateField("sslEnabled", event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="false">사용 안 함</option>
            <option value="true">사용</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2" htmlFor="options">
          추가 연결 옵션
          <textarea
            id="options"
            value={form.additionalOptions}
            onChange={(event) => updateField("additionalOptions", event.target.value)}
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            placeholder="connectionLimit=5&timezone=Z"
          />
        </label>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <ActionButton disabled={!canUseDatabaseActions || isTesting} onClick={testConnection}>
          {isTesting ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
          연결 테스트
        </ActionButton>
        <ActionButton variant="primary" disabled={!canUseDatabaseActions || isSaving} onClick={saveSetting}>
          {isSaving ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />}
          접속정보 저장
        </ActionButton>
        <ActionButton disabled={isLoadingMigration} onClick={loadMigrationStatus}>
          {isLoadingMigration ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
          SQL 보기
        </ActionButton>
        <ActionButton variant="danger" disabled={!canUseDatabaseActions} onClick={() => setShowMigrationModal(true)}>
          <Play size={16} aria-hidden />
          Migration 실행
        </ActionButton>
      </div>

      <ResultPanel result={testResult} />
      <SavePanel result={saveResult} />
      <MigrationPanel result={migrationResult} />
      <RunPanel result={migrationRunResult} />

      {showMigrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Prisma migration 실행</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  이 작업은 입력한 MySQL DB에 schema 변경을 적용하고 `prisma/migrations` 파일을 만들 수 있습니다.
                </p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setShowMigrationModal(false)}
                title="닫기"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="migration-name">
              Migration 이름
              <input
                id="migration-name"
                value={migrationName}
                onChange={(event) => setMigrationName(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="confirmation">
              확인 문구
              <input
                id="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="RUN_MIGRATION"
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setShowMigrationModal(false)}
              >
                취소
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={confirmation !== "RUN_MIGRATION" || !migrationName.trim() || isRunningMigration}
                onClick={runMigration}
              >
                {isRunningMigration ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                실행
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={name}>
      {label}
      <input
        id={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
      />
    </label>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = "default"
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const classes =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "danger"
        ? "border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ResultPanel({ result }: { result: TestResult }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-lg border p-4 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      }`}
    >
      <p className="font-medium">{result.message}</p>
      {result.version && <p className="mt-1">MySQL version: {result.version}</p>}
      {result.maskedDatabaseUrl && <p className="mt-1 break-all font-mono text-xs">{result.maskedDatabaseUrl}</p>}
      {result.error && <p className="mt-1">{result.error}</p>}
    </div>
  );
}

function SavePanel({ result }: { result: SaveResult }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-lg border p-4 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      }`}
    >
      <p className="font-medium">{result.message}</p>
      {result.setting && (
        <p className="mt-1">
          {result.setting.host}:{result.setting.port} / {result.setting.databaseName} / {result.setting.username}
        </p>
      )}
    </div>
  );
}

function MigrationPanel({ result }: { result: MigrationResult }) {
  if (!result) {
    return null;
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <p className="font-medium">Prisma provider: {result.provider}</p>
      <p className="mt-1">저장된 DB 설정: {result.hasStoredSetting ? "있음" : "없음"}</p>
      <p className="mt-1">DATABASE_URL: {result.hasDatabaseUrl ? "설정됨" : "비어 있음"}</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {result.createDatabaseSql || "저장된 DB 설정이 없어 CREATE DATABASE SQL을 만들 수 없습니다."}
      </pre>
      <div className="mt-3 space-y-1">
        {result.commands.map((command) => (
          <code key={command} className="block rounded-md bg-white px-2 py-1 font-mono text-xs dark:bg-slate-900">
            {command}
          </code>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{result.notes.join(" ")}</p>
    </div>
  );
}

function RunPanel({ result }: { result: MigrationRunResult }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-lg border p-4 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      }`}
    >
      <p className="font-medium">{result.message}</p>
      {result.command && <p className="mt-1 font-mono text-xs">{result.command}</p>}
      {typeof result.exitCode === "number" && <p className="mt-1">exitCode: {result.exitCode}</p>}
      {(result.stdout || result.stderr) && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
          {[result.stdout, result.stderr].filter(Boolean).join("\n")}
        </pre>
      )}
    </div>
  );
}
