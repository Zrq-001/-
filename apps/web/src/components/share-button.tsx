"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [shared, setShared] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {
      // Ignore cancelled native share actions.
    }
  };

  return <button type="button" onClick={share} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#ded8cd] bg-white px-3 text-xs font-bold text-[#657064] transition hover:border-[#236b5a] hover:text-[#236b5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9eee3]" aria-label={shared ? "链接已复制" : `分享${title}`}>
    {shared ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
    {shared ? "链接已复制" : "分享"}
  </button>;
}
