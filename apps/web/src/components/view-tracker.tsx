"use client";

import { useEffect } from "react";
import { NOTEBOOK_CHANGE_EVENT, RECENT_VIEWS_KEY, type RecentView } from "@/lib/notebook";

export function ViewTracker({ itemId }: { itemId: string }) {
  useEffect(() => {
    try {
      const previous: RecentView[] = JSON.parse(window.localStorage.getItem(RECENT_VIEWS_KEY) ?? "[]");
      const next = [{ itemId, viewedAt: new Date().toISOString() }, ...previous.filter((entry) => entry.itemId !== itemId)].slice(0, 16);
      window.localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(NOTEBOOK_CHANGE_EVENT));
    } catch {
      // Recently viewed is a convenience feature; the page remains usable if storage is unavailable.
    }
  }, [itemId]);

  return null;
}
