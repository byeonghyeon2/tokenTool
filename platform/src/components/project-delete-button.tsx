"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export function ProjectDeleteButton({ projectName }: { projectName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteProject() {
    const confirmed = window.confirm(`${projectName} 프로젝트 폴더를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { ok: boolean; message: string };

      if (!data.ok) {
        window.alert(data.message);
        return;
      }

      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
      disabled={isDeleting}
      onClick={deleteProject}
      type="button"
    >
      {isDeleting ? <Loader2 className="animate-spin" size={13} aria-hidden /> : <Trash2 size={13} aria-hidden />}
      삭제
    </button>
  );
}
