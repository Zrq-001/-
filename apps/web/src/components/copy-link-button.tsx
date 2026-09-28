"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyLinkButton({ label = "复制当前链接" }: { label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={() => void copy()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#236b5a] hover:bg-[#e7f0d6]" aria-label={copied ? "当前筛选链接已复制" : label}>
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "链接已复制" : label}
    </button>
  );
}
