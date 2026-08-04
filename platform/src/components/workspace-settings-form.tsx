"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import type { StoredWorkspaceSetting } from "@/lib/workspace-files";

type SaveResult =
  | {
      ok: boolean;
      message: string;
      setting?: StoredWorkspaceSetting;
    }
  | null;

export function WorkspaceSettingsForm({ initialSetting }: { initialSetting: StoredWorkspaceSetting }) {
  const [form, setForm] = useState({
    workspaceRoot: initialSetting.workspaceRoot,
    projectsRoot: initialSetting.projectsRoot,
    codexCommand: initialSetting.codexCommand,
    codexArgsJson: initialSetting.codexArgsJson,
    codexCliEnabled: String(initialSetting.codexCliEnabled),
    codexTimeoutMs: String(initialSetting.codexTimeoutMs)
  });
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResult>(null);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveSetting() {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch("/api/workspace/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          codexCliEnabled: form.codexCliEnabled === "true",
          codexTimeoutMs: Number(form.codexTimeoutMs)
        })
      });
      setResult((await response.json()) as SaveResult);
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Workspace 설정 저장에 실패했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Workspace 설정</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          프로젝트 루트와 Codex CLI 실행 설정을 관리합니다. 다양한 언어의 프로젝트를 넣어도 감지 기준 파일로 구분합니다.
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <TextField label="WORKSPACE_ROOT" name="workspaceRoot" value={form.workspaceRoot} onChange={updateField} />
        <TextField label="PROJECTS_ROOT" name="projectsRoot" value={form.projectsRoot} onChange={updateField} />
        <TextField label="CODEX_COMMAND" name="codexCommand" value={form.codexCommand} onChange={updateField} />
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="codexArgsJson">
          CODEX_ARGS_JSON
          <textarea
            id="codexArgsJson"
            value={form.codexArgsJson}
            onChange={(event) => updateField("codexArgsJson", event.target.value)}
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="codexCliEnabled">
            CODEX_CLI_ENABLED
            <select
              id="codexCliEnabled"
              value={form.codexCliEnabled}
              onChange={(event) => updateField("codexCliEnabled", event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="false">false - 실제 CLI 실행 차단</option>
              <option value="true">true - 확인 문구 입력 시 실행 허용</option>
            </select>
          </label>
          <TextField label="CODEX_TIMEOUT_MS" name="codexTimeoutMs" value={form.codexTimeoutMs} onChange={updateField} />
        </div>
      </form>

      <div className="mt-6 flex justify-end">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={saveSetting}
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />}
          설정 저장
        </button>
      </div>

      {result && (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          <p className="font-medium">{result.message}</p>
          {result.setting && <p className="mt-1 break-all font-mono text-xs">{result.setting.projectsRoot}</p>}
        </div>
      )}
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: "workspaceRoot" | "projectsRoot" | "codexCommand" | "codexTimeoutMs";
  value: string;
  onChange: (name: "workspaceRoot" | "projectsRoot" | "codexCommand" | "codexTimeoutMs", value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={name}>
      {label}
      <input
        id={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
      />
    </label>
  );
}
