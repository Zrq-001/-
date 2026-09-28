"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  NOTEBOOK_CHANGE_EVENT,
  NOTEBOOK_META_KEY,
  RECENT_VIEWS_KEY,
  SAVED_ITEMS_KEY,
} from "@/lib/notebook";

const VERSION = 1;
const STORAGE_KEYS = [SAVED_ITEMS_KEY, NOTEBOOK_META_KEY, RECENT_VIEWS_KEY] as const;

type NotebookBackup = {
  app: "rong-xiao-zhao";
  version: number;
  exportedAt: string;
  data: Partial<Record<(typeof STORAGE_KEYS)[number], string>>;
};

function readLocalData(): NotebookBackup {
  const data: NotebookBackup["data"] = {};
  for (const key of STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { app: "rong-xiao-zhao", version: VERSION, exportedAt: new Date().toISOString(), data };
}

export function NotebookTransfer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");

  const exportNotebook = () => {
    try {
      const blob = new Blob([JSON.stringify(readLocalData(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rong-xiaozhao-notebook-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("小本本已导出");
    } catch {
      setNotice("导出失败，请稍后再试");
    }
  };

  const importNotebook = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as NotebookBackup;
      if (backup?.app !== "rong-xiao-zhao" || backup?.version !== VERSION || !backup.data) throw new Error("invalid backup");
      for (const key of STORAGE_KEYS) {
        const value = backup.data[key];
        if (typeof value === "string") window.localStorage.setItem(key, value);
      }
      window.dispatchEvent(new Event(NOTEBOOK_CHANGE_EVENT));
      setNotice("小本本已恢复");
    } catch {
      setNotice("文件格式不对，请选择蓉小招导出的 JSON");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="小本本数据转移">
      <button type="button" onClick={exportNotebook} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d4dfd1] bg-[#f8fcf5] px-3.5 text-xs font-extrabold text-[#236b5a] transition hover:border-[#236b5a]">
        <Download className="size-3.5" />导出小本本
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#ded8cd] bg-white px-3.5 text-xs font-extrabold text-[#526052] transition hover:border-[#ee6145] hover:text-[#c94a34]">
        <Upload className="size-3.5" />恢复备份
      </button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importNotebook(file); }} />
      {notice && <span className="text-xs font-bold text-[#6c7169]" role="status">{notice}</span>}
    </div>
  );
}
