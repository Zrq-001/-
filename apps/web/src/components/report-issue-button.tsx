"use client";

import { ClipboardCheck, Flag } from "lucide-react";
import { useState } from "react";

type ReportIssueButtonProps = {
  kind: "职位" | "企业";
  itemId: string;
  title: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

export function ReportIssueButton({ kind, itemId, title, sourceUrl = "", verifiedAt = "" }: ReportIssueButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyReport = async () => {
    const report = [
      "蓉小招信息反馈",
      `类型：${kind}`,
      `编号：${itemId}`,
      `名称：${title}`,
      `来源：${sourceUrl || "未提供"}`,
      `页面：${window.location.href}`,
      `最近核验：${verifiedAt || "未标注"}`,
      "问题描述：",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2600);
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={copyReport} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d8d0c3] bg-white px-3.5 text-xs font-extrabold text-[#657064] transition hover:border-[#236b5a] hover:text-[#236b5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9eee3]">
      {copied ? <ClipboardCheck className="size-3.5" /> : <Flag className="size-3.5" />}
      {copied ? "反馈模板已复制" : "信息有误？复制反馈"}
    </button>
    {copied && <span className="text-xs font-bold text-[#236b5a]" aria-live="polite">补充问题后发给维护者即可</span>}
  </div>;
}
