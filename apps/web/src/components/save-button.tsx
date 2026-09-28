"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { NOTEBOOK_CHANGE_EVENT, SAVED_ITEMS_KEY } from "@/lib/notebook";

export function SaveButton({ itemId, label, compact = false }: { itemId: string; label: string; compact?: boolean }) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return JSON.parse(window.localStorage.getItem(SAVED_ITEMS_KEY) ?? "[]").includes(itemId); } catch { return false; }
  });

  const toggle = () => {
    try {
      const values: string[] = JSON.parse(window.localStorage.getItem(SAVED_ITEMS_KEY) ?? "[]");
      const next = values.includes(itemId) ? values.filter((value) => value !== itemId) : [...values, itemId];
      window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(NOTEBOOK_CHANGE_EVENT));
      setSaved(next.includes(itemId));
    } catch {
      setSaved((current: boolean) => !current);
    }
  };

  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={`${saved ? "取消收藏" : "收藏"}${label}`} title={saved ? "已收藏" : "收藏"} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${saved ? "border-[#ee6145] bg-[#fff0ec] text-[#c94a34]" : "border-[#ded8cd] bg-white text-[#6c7169] hover:border-[#236b5a] hover:text-[#236b5a]"}`}><Heart className={`size-4 ${saved ? "fill-current" : ""}`} />{compact ? null : saved ? "已收藏" : "收藏"}</button>;
}
