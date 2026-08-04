"use client";

import { ChangeEvent, useRef, useState } from "react";
import { FolderPlus } from "lucide-react";

export function NewProjectButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  function openFolderPicker() {
    inputRef.current?.click();
  }

  function onFolderPicked(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const firstPath = files[0]?.webkitRelativePath || files[0]?.name || "";
    const folderName = firstPath.split("/")[0] || "선택한 프로젝트";

    setMessage(files.length > 0 ? `${folderName} 선택됨. projects 폴더에 복사하면 목록에 표시됩니다.` : "");
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        onClick={openFolderPicker}
        type="button"
      >
        <FolderPlus size={16} aria-hidden />
        신규 프로젝트
      </button>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        multiple
        onChange={onFolderPicked}
        {...{ webkitdirectory: "", directory: "" }}
      />
      {message && <p className="max-w-xs text-right text-xs leading-5 text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}
