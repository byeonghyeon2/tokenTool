"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Github, Loader2, RefreshCw, Upload, type LucideIcon } from "lucide-react";

type ImportResponse =
  | {
      ok: true;
      result: {
        projectName: string;
        projectPath: string;
        source: "github" | "upload";
        action?: "cloned" | "pulled" | "uploaded";
        message: string;
      };
    }
  | { ok: false; message: string };

export function ProjectImportActions({ projectsRoot }: { projectsRoot: string }) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProjectName, setUploadProjectName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubProjectName, setGithubProjectName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onFolderPicked(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const firstPath = files[0]?.webkitRelativePath || files[0]?.name || "";
    const folderName = firstPath.split("/")[0] || "";

    setUploadFiles(files);
    setUploadProjectName(folderName);
    setMessage(files.length > 0 ? `${folderName} 폴더에서 ${files.length}개 파일을 선택했습니다.` : "");
  }

  async function importGithubProject() {
    await submitJson("/api/projects/github/import", {
      repoUrl: githubUrl,
      projectName: githubProjectName || undefined
    });
  }

  async function uploadProjectFolder() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("projectName", uploadProjectName);

      for (const file of uploadFiles) {
        formData.append("files", file, file.webkitRelativePath || file.name);
      }

      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as ImportResponse;
      setMessage(data.ok ? `${data.result.message} 목록을 새로고침해 확인하세요.` : data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로젝트 업로드에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitJson(url: string, body: unknown) {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await response.json()) as ImportResponse;
      setMessage(data.ok ? `${data.result.message} 목록을 새로고침해 확인하세요.` : data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로젝트 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => setIsOpen((value) => !value)} type="button">
          {isOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
          <span className="font-semibold text-slate-950 dark:text-white">프로젝트 추가</span>
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">폴더 업로드 또는 GitHub clone/pull</span>
        </button>
        <button
          className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={(event) => {
            event.stopPropagation();
            window.location.reload();
          }}
          type="button"
        >
          <RefreshCw size={13} aria-hidden />
          새로고침
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400" title={projectsRoot}>
            저장 위치: 관리툴의 <span className="font-medium text-slate-700 dark:text-slate-200">projects/</span> 하위
          </p>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <Label icon={Upload} title="1. 폴더 업로드" text="선택한 폴더의 내용을 projects/프로젝트명 아래로 복사합니다." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => uploadInputRef.current?.click()}
                type="button"
              >
                <FolderPlus size={15} aria-hidden />
                폴더 선택
              </button>
              <input
                value={uploadProjectName}
                onChange={(event) => setUploadProjectName(event.target.value)}
                placeholder="저장할 프로젝트명"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
              />
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting || uploadFiles.length === 0 || !uploadProjectName.trim()}
                onClick={uploadProjectFolder}
                type="button"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={15} aria-hidden /> : <Upload size={15} aria-hidden />}
                업로드
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <Label icon={Github} title="2. GitHub clone / pull" text="처음이면 projects/프로젝트명으로 clone하고, 이미 있으면 해당 폴더에서 pull합니다." />
            <input
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
            />
            <div className="flex gap-2">
              <input
                value={githubProjectName}
                onChange={(event) => setGithubProjectName(event.target.value)}
                placeholder="저장할 프로젝트명, 비우면 저장소명 사용"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
              />
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                disabled={isSubmitting || !githubUrl.trim()}
                onClick={importGithubProject}
                type="button"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={15} aria-hidden /> : <Github size={15} aria-hidden />}
                실행
              </button>
            </div>
          </div>

          <input ref={uploadInputRef} className="hidden" type="file" multiple onChange={onFolderPicked} {...{ webkitdirectory: "", directory: "" }} />
          {message && <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
        </div>
      )}
    </section>
  );
}

function Label({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 text-slate-500" size={15} aria-hidden />
      <div>
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}
