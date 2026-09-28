"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  ExternalLink,
  Heart,
  PencilLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  NOTEBOOK_CHANGE_EVENT,
  NOTEBOOK_META_KEY,
  RECENT_VIEWS_KEY,
  SAVED_ITEMS_KEY,
  type NotebookEntry,
  type NotebookMeta,
  type NotebookStatus,
  type RecentView,
} from "@/lib/notebook";

const statusOptions: { value: NotebookStatus; label: string; className: string }[] = [
  { value: "later", label: "以后再看", className: "bg-[#f0ece4] text-[#626a61]" },
  { value: "to_apply", label: "准备投", className: "bg-[#fff0c9] text-[#8b5b09]" },
  { value: "applied", label: "已投递", className: "bg-[#dceee8] text-[#236b5a]" },
];

type BoardItem = {
  entry: NotebookEntry;
  viewedAt?: string;
};

function subscribeToNotebook(onStoreChange: () => void) {
  window.addEventListener(NOTEBOOK_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(NOTEBOOK_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerSnapshot() {
  return "";
}

function getStorageSnapshot(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function useStoredJson<T>(key: string, fallback: T) {
  const rawValue = useSyncExternalStore(
    subscribeToNotebook,
    () => getStorageSnapshot(key),
    getServerSnapshot,
  );

  return useMemo(() => parseJson(rawValue, fallback), [fallback, rawValue]);
}

function formatViewedAt(value?: string) {
  if (!value) return "刚刚浏览";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近浏览";

  return `浏览于 ${date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function NotebookBoard({ entries }: { entries: NotebookEntry[] }) {
  const savedIds = useStoredJson<string[]>(SAVED_ITEMS_KEY, []);
  const recentViews = useStoredJson<RecentView[]>(RECENT_VIEWS_KEY, []);
  const meta = useStoredJson<Record<string, NotebookMeta>>(NOTEBOOK_META_KEY, {});
  const [mode, setMode] = useState<"saved" | "recent">("saved");
  const [kind, setKind] = useState<"all" | NotebookEntry["kind"]>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const entryById = useMemo(
    () => new Map(entries.map((entry) => [entry.itemId, entry])),
    [entries],
  );

  const savedEntries = useMemo(
    () =>
      savedIds
        .map((itemId) => entryById.get(itemId))
        .filter((entry): entry is NotebookEntry => Boolean(entry)),
    [entryById, savedIds],
  );

  const recentEntries = useMemo(
    () =>
      recentViews
        .map((view) => ({
          entry: entryById.get(view.itemId),
          viewedAt: view.viewedAt,
        }))
        .filter(
          (item): item is { entry: NotebookEntry; viewedAt: string } =>
            Boolean(item.entry),
        ),
    [entryById, recentViews],
  );

  const rawItems: BoardItem[] =
    mode === "saved"
      ? savedEntries.map((entry) => ({ entry }))
      : recentEntries;

  const visibleItems = rawItems.filter(
    (item) => kind === "all" || item.entry.kind === kind,
  );

  const writeMeta = (nextMeta: Record<string, NotebookMeta>) => {
    try {
      window.localStorage.setItem(NOTEBOOK_META_KEY, JSON.stringify(nextMeta));
      window.dispatchEvent(new Event(NOTEBOOK_CHANGE_EVENT));
      return true;
    } catch {
      setSavedNotice("暂时无法保存，请检查浏览器的本地存储设置。");
      return false;
    }
  };

  const updateStatus = (itemId: string, status: NotebookStatus) => {
    writeMeta({
      ...meta,
      [itemId]: {
        status,
        note: meta[itemId]?.note ?? "",
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const beginEdit = (itemId: string) => {
    setEditingId(itemId);
    setDraft(meta[itemId]?.note ?? "");
    setSavedNotice("");
  };

  const saveNote = (itemId: string) => {
    const didSave = writeMeta({
      ...meta,
      [itemId]: {
        status: meta[itemId]?.status ?? "later",
        note: draft.trim(),
        updatedAt: new Date().toISOString(),
      },
    });

    if (didSave) {
      setEditingId(null);
      setSavedNotice("备注已保存在这台设备上");
    }
  };

  const removeSaved = (itemId: string) => {
    try {
      const next = savedIds.filter((id) => id !== itemId);
      window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(NOTEBOOK_CHANGE_EVENT));
      setSavedNotice("已从收藏中移除");
    } catch {
      setSavedNotice("暂时无法更新收藏，请检查浏览器的本地存储设置。");
    }
  };

  const statusFor = (itemId: string) =>
    statusOptions.find(
      (option) => option.value === (meta[itemId]?.status ?? "later"),
    ) ?? statusOptions[0];

  return (
    <section className="pb-16" aria-labelledby="notebook-title">
      <div className="rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_10px_0_rgba(47,69,44,0.06)] sm:p-6">
        <div className="flex flex-col gap-5 border-b border-dashed border-[#ded8cd] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-[#c94a34]">YOUR LITTLE TRACKER</p>
            <h2 id="notebook-title" className="company-entry-title mt-2 text-3xl text-[#172319]">
              把想法慢慢理清楚
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6c7169]">
              收藏、浏览记录、投递状态和备注，都只保存在当前设备。
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="小本本内容">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "saved"}
              onClick={() => setMode("saved")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
                mode === "saved"
                  ? "bg-[#ee6145] text-white shadow-[0_4px_0_#ba422d]"
                  : "bg-[#f0ece4] text-[#5e675e] hover:bg-[#e7f0d6]"
              }`}
            >
              <Heart className={`size-4 ${mode === "saved" ? "fill-current" : ""}`} />
              已收藏 <span className="opacity-70">{savedEntries.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "recent"}
              onClick={() => setMode("recent")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
                mode === "recent"
                  ? "bg-[#236b5a] text-white shadow-[0_4px_0_#174a3d]"
                  : "bg-[#f0ece4] text-[#5e675e] hover:bg-[#e7f0d6]"
              }`}
            >
              <Clock3 className="size-4" />
              最近浏览 <span className="opacity-70">{recentEntries.length}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="内容类型筛选">
            {[
              { value: "all", label: "全部" },
              { value: "job", label: "岗位" },
              { value: "company", label: "企业" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={kind === option.value}
                onClick={() => setKind(option.value as typeof kind)}
                className={`min-h-10 rounded-full border px-3.5 text-sm font-bold transition ${
                  kind === option.value
                    ? "border-[#1d402f] bg-[#1d402f] text-white"
                    : "border-[#ded8cd] bg-white text-[#657064] hover:border-[#b9ceb9] hover:bg-[#f8fcf5]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-xs leading-5 text-[#858a82]">
            <Check className="size-3.5 text-[#236b5a]" />
            你写的内容不会被上传
          </p>
        </div>

        {savedNotice && (
          <p
            className="mt-4 rounded-xl bg-[#e7f0d6] px-3 py-2 text-sm font-bold text-[#236b5a]"
            role="status"
          >
            {savedNotice}
          </p>
        )}

        {visibleItems.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {visibleItems.map(({ entry, viewedAt }) => {
              const status = statusFor(entry.itemId);
              const isEditing = editingId === entry.itemId;

              return (
                <article
                  key={`${mode}:${entry.itemId}`}
                  className="rounded-[24px] border border-[#ded8cd] bg-[#fffdfa] p-4 transition hover:border-[#b9ceb9] sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            entry.kind === "job"
                              ? "bg-[#fff0df] text-[#9b531f]"
                              : "bg-[#e4f1e8] text-[#236b5a]"
                          }`}
                        >
                          {entry.kind === "job" ? (
                            <BriefcaseBusiness className="size-3.5" />
                          ) : (
                            <Building2 className="size-3.5" />
                          )}
                          {entry.kind === "job" ? "岗位" : "企业"}
                        </span>
                        {entry.isOfficial && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#236b5a]">
                            <BookmarkCheck className="size-3.5" />
                            官方来源
                          </span>
                        )}
                        {viewedAt && (
                          <span className="text-xs text-[#858a82]">
                            {formatViewedAt(viewedAt)}
                          </span>
                        )}
                      </div>
                      <h3 className="company-entry-title mt-2 text-xl leading-tight text-[#172319]">
                        <Link href={entry.href} className="hover:text-[#ee6145]">
                          {entry.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#526052]">{entry.subtitle}</p>
                      <p className="mt-2 text-sm text-[#747970]">{entry.detail}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`status-${entry.itemId}`}>
                        求职状态
                      </label>
                      <select
                        id={`status-${entry.itemId}`}
                        value={status.value}
                        onChange={(event) =>
                          updateStatus(entry.itemId, event.target.value as NotebookStatus)
                        }
                        className={`min-h-10 rounded-full border-0 px-3 text-xs font-extrabold outline-none ring-1 ring-inset ring-black/5 focus:ring-2 focus:ring-[#236b5a] ${status.className}`}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {mode === "saved" && (
                        <button
                          type="button"
                          onClick={() => removeSaved(entry.itemId)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#8a6a67] hover:bg-[#fff0ec] hover:text-[#c94a34]"
                        >
                          <Trash2 className="size-3.5" />
                          取消收藏
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-dashed border-[#ded8cd] pt-3">
                    {isEditing ? (
                      <div>
                        <label className="sr-only" htmlFor={`note-${entry.itemId}`}>
                          求职备注
                        </label>
                        <textarea
                          id={`note-${entry.itemId}`}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          maxLength={280}
                          rows={3}
                          placeholder="例如：下周投递；朋友在这里；再看看岗位要求……"
                          className="w-full resize-y rounded-xl border border-[#ded8cd] bg-[#fcfaf6] p-3 text-sm text-[#172319] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveNote(entry.itemId)}
                            className="inline-flex min-h-10 items-center rounded-xl bg-[#ee6145] px-4 text-sm font-extrabold text-white shadow-[0_4px_0_#ba422d] transition active:translate-y-[2px] active:shadow-[0_2px_0_#ba422d]"
                          >
                            保存备注
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-10 rounded-xl px-3 text-sm font-bold text-[#657064] hover:bg-[#f0ece4]"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`min-w-0 text-sm leading-6 ${
                            meta[entry.itemId]?.note
                              ? "text-[#526052]"
                              : "text-[#91968e]"
                          }`}
                        >
                          {meta[entry.itemId]?.note || "还没有备注，给未来的自己留一句话吧。"}
                        </p>
                        <button
                          type="button"
                          onClick={() => beginEdit(entry.itemId)}
                          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"
                        >
                          <PencilLine className="size-3.5" />
                          {meta[entry.itemId]?.note ? "修改备注" : "写备注"}
                        </button>
                      </div>
                    )}
                  </div>

                  <Link
                    href={entry.href}
                    className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d4dfd1] bg-[#f8fcf5] px-3.5 text-sm font-extrabold text-[#236b5a] hover:border-[#236b5a]"
                  >
                    继续查看 <ExternalLink className="size-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[26px] border border-dashed border-[#c9c1b4] bg-[#fffaf4] px-6 py-15 text-center">
            <Sparkles className="mx-auto size-8 text-[#ee6145]" />
            <h3 className="company-entry-title mt-4 text-2xl text-[#172319]">
              {mode === "saved" ? "这里还没有收藏" : "还没有浏览记录"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6c7169]">
              {mode === "saved"
                ? "在岗位或企业页点一下爱心，之后就可以在这里统一安排投递节奏。"
                : "去看看企业或职位详情，小本本会帮你记住最近浏览过的内容。"}
            </p>
            <Link
              href={mode === "saved" ? "/jobs" : "/companies"}
              className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-[#ee6145] px-4 text-sm font-extrabold text-white shadow-[0_5px_0_#ba422d] transition hover:-translate-y-0.5 hover:shadow-[0_7px_0_#ba422d]"
            >
              {mode === "saved" ? "去查岗位" : "去找企业"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
