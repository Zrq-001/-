"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Filter,
  FolderClock,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { SourceReviewItem, SourceReviewQueue } from "@/lib/source-review";

type DecisionDraft = {
  decision: string;
  evidenceUrl: string;
  notes: string;
};

type FilterValue = "all" | "high" | "medium" | "low";

const priorityMeta = {
  high: { label: "优先处理", badge: "bg-[#ffe5df] text-[#aa3b2b] border-[#f4b6aa]", dot: "bg-[#ee6145]" },
  medium: { label: "本轮处理", badge: "bg-[#fff0cf] text-[#9a6415] border-[#eed091]", dot: "bg-[#e9a339]" },
  low: { label: "后续跟进", badge: "bg-[#e7f0d6] text-[#3d6732] border-[#bdd6a8]", dot: "bg-[#7aa65d]" },
};

const kindMeta: Record<SourceReviewItem["kind"], { label: string; icon: typeof FileWarning }> = {
  source_health: { label: "来源健康检查", icon: FileWarning },
  candidate_added: { label: "新增岗位候选", icon: ClipboardCheck },
  candidate_changed: { label: "岗位变化候选", icon: FolderClock },
  candidate_not_observed: { label: "本次未观察到", icon: TriangleAlert },
};

const decisionLabels: Record<string, { label: string; hint: string; tone: string }> = {
  approve_for_data_entry: { label: "批准录入", hint: "进入 CSV 人工维护流程", tone: "border-[#8cb485] bg-[#edf6e7] text-[#28583a]" },
  reject_candidate: { label: "不采纳", hint: "候选不满足发布条件", tone: "border-[#e0bbb1] bg-[#fff4f0] text-[#a94a3a]" },
  confirm_manual_followup: { label: "确认跟进", hint: "保留人工复核，不改数据", tone: "border-[#a5c8bb] bg-[#edf7f3] text-[#256451]" },
  pause_target: { label: "暂停适配", hint: "暂停此来源自动扫描", tone: "border-[#e0bbb1] bg-[#fff4f0] text-[#a94a3a]" },
  dismiss_candidate: { label: "不再跟进", hint: "不产生数据动作", tone: "border-[#dfd5c5] bg-[#f7f3ea] text-[#6c6255]" },
  defer: { label: "稍后处理", hint: "保留在下一轮审核", tone: "border-[#d7ceb9] bg-[#fffaf0] text-[#716652]" },
};

function dateLabel(value: string) {
  if (!value) return "尚未生成";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function candidateTitle(item: SourceReviewItem) {
  if (item.kind === "source_health") return item.scan?.result === "manual_review_needed" ? "页面可访问，但结构化岗位待确认" : item.scan?.result || "尚未扫描";
  const candidate = item.candidate as { title?: string; after?: { title?: string }; before?: { title?: string } } | null;
  return candidate?.title || candidate?.after?.title || candidate?.before?.title || "岗位信息待复核";
}

function requiresEvidence(decision: string) {
  return decision === "approve_for_data_entry" || decision === "confirm_manual_followup";
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SourceReviewDesk({ queue }: { queue: SourceReviewQueue }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [activeId, setActiveId] = useState(queue.items[0]?.id ?? "");
  const [reviewer, setReviewer] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({});
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(
    () => queue.items.filter((item) => filter === "all" || item.priority === filter),
    [filter, queue.items],
  );
  const activeItem = visibleItems.find((item) => item.id === activeId) ?? visibleItems[0] ?? null;
  const selectedCount = Object.values(drafts).filter((draft) => draft.decision).length;

  const updateDraft = (itemId: string, patch: Partial<DecisionDraft>) => {
    setDrafts((current) => {
      const existing = current[itemId] ?? { decision: "", evidenceUrl: "", notes: "" };
      return { ...current, [itemId]: { ...existing, ...patch } };
    });
    setNotice("");
    setErrors([]);
  };

  const exportDecisions = () => {
    const completed = queue.items
      .map((item) => ({ item, draft: drafts[item.id] }))
      .filter((entry): entry is { item: SourceReviewItem; draft: DecisionDraft } => Boolean(entry.draft?.decision));
    const nextErrors: string[] = [];

    if (!reviewer.trim()) nextErrors.push("请填写审核人，方便后续追溯这份决定文件。");
    if (completed.length === 0) nextErrors.push("请至少完成一项审核决定，才可以导出 decisions.json。");
    for (const { item, draft } of completed) {
      if (draft.notes.trim().length < 8) nextErrors.push(`「${candidateTitle(item)}」的判断说明至少需要 8 个字符。`);
      if (requiresEvidence(draft.decision) && !draft.evidenceUrl.trim()) nextErrors.push(`「${candidateTitle(item)}」需要填写官方证据链接。`);
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setNotice("");
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    const output = {
      schemaVersion: 1,
      queueFingerprint: queue.queueFingerprint,
      reviewer: reviewer.trim(),
      decisions: completed.map(({ item, draft }) => ({
        itemId: item.id,
        decision: draft.decision,
        evidenceUrl: draft.evidenceUrl.trim(),
        notes: draft.notes.trim(),
        reviewedAt: new Date().toISOString(),
      })),
    };

    downloadFile("decisions.json", `${JSON.stringify(output, null, 2)}\n`);
    setErrors([]);
    setNotice("已下载 decisions.json。请放入 source-reviews 目录后，再运行 pnpm source:review:check。 ");
  };

  const copyCommand = async () => {
    const command = "pnpm source:review:check";
    try {
      await navigator.clipboard.writeText(command);
      setNotice("校验命令已复制。导出文件放到指定目录后即可执行。");
    } catch {
      setNotice(`请在项目目录运行：${command}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#172319]">
      <header className="border-b border-[#dfd9cd] bg-[#fffaf4]">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="group grid size-10 shrink-0 place-items-center rounded-[15px] bg-[#1d402f] transition hover:-rotate-6 focus-visible:outline-offset-4" aria-label="返回蓉小招首页">
              <BrandMark className="size-7" />
            </Link>
            <div className="min-w-0">
              <p className="playful-label text-[#236b5a]">RONG XIAO ZHAO / OPS DESK</p>
              <h1 className="company-entry-title truncate text-xl text-[#172319] sm:text-2xl">来源审核台</h1>
            </div>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d9d1c3] bg-white px-3 text-sm font-bold text-[#405246] transition hover:border-[#a6c9b9] hover:bg-[#eff8f4] sm:px-4">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">回到前台</span>
          </Link>
        </div>
      </header>

      <section className="site-grid border-b border-[#ded8cd] bg-[#fff0df]">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-9 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-11">
          <div>
            <p className="eyebrow text-[#c94a34]">HUMAN REVIEW REQUIRED</p>
            <h2 className="display-title mt-2 max-w-3xl text-4xl leading-[.96] text-[#172319] sm:text-5xl">先确认，再更新。<br />不让页面波动变成假职位。</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526052]">这里读取本机生成的来源扫描队列。审核决定会导出为文件，仍需经过命令校验和 CSV 人工维护；本页不会提交数据，也不会直接改网站内容。</p>
          </div>
          <div className="max-w-sm rounded-[22px] border border-[#f1c7a4] bg-[#fffaf4] p-4 shadow-[0_7px_0_rgba(193,112,63,.08)]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1d402f] text-white"><ShieldAlert className="size-5" aria-hidden="true" /></span>
              <p className="text-sm leading-6 text-[#596255]"><strong className="text-[#172319]">本地运营工具</strong><br />当前没有账号权限系统，请仅在本机开发环境使用；正式上线前必须补充访问控制。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-4" aria-label="审核队列摘要">
          <div className="rounded-[20px] border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_5px_0_rgba(47,69,44,.05)]"><p className="text-sm font-bold text-[#6c7169]">待审核</p><p className="company-entry-title mt-1 text-3xl text-[#172319]">{queue.summary.total}</p></div>
          {(["high", "medium", "low"] as const).map((priority) => <div key={priority} className="rounded-[20px] border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_5px_0_rgba(47,69,44,.05)]"><p className="flex items-center gap-2 text-sm font-bold text-[#6c7169]"><span className={`size-2 rounded-full ${priorityMeta[priority].dot}`} aria-hidden="true" />{priorityMeta[priority].label}</p><p className="company-entry-title mt-1 text-3xl text-[#172319]">{queue.summary[priority]}</p></div>)}
        </div>

        {queue.items.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-[#cfc5b4] bg-[#fffdfa] px-6 py-14 text-center shadow-[0_8px_0_rgba(47,69,44,.05)]">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7f0d6] text-[#236b5a]"><ClipboardCheck className="size-7" aria-hidden="true" /></span>
            <h2 className="company-entry-title mt-5 text-3xl text-[#172319]">暂时没有可审核的扫描结果</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#626a61]">请先在项目目录运行来源扫描和审核队列生成命令。本页不会展示虚构样本，以免误导运营判断。</p>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-[#20392a] px-4 py-3 text-left font-mono text-sm text-[#eef4dc]">pnpm source:scan:bytedance<br />pnpm source:review</div>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(270px,.78fr)_minmax(0,1.55fr)]">
            <aside className="rounded-[26px] border border-[#ded8cd] bg-[#fffdfa] p-3 shadow-[0_9px_0_rgba(47,69,44,.05)] lg:sticky lg:top-5 lg:h-fit">
              <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#d8cfbf] px-2 pb-3">
                <div className="flex items-center gap-2"><Filter className="size-4 text-[#236b5a]" aria-hidden="true" /><h2 className="company-entry-title text-xl">待办队列</h2></div>
                <span className="rounded-full bg-[#e7f0d6] px-2.5 py-1 text-xs font-extrabold text-[#315b37]">{visibleItems.length} 项</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="按优先级筛选">
                {([{ value: "all", label: "全部", count: queue.summary.total }, { value: "high", label: "优先", count: queue.summary.high }, { value: "medium", label: "本轮", count: queue.summary.medium }, { value: "low", label: "后续", count: queue.summary.low }] as const).map((option) => <button key={option.value} type="button" role="tab" aria-selected={filter === option.value} onClick={() => { setFilter(option.value); setActiveId((current) => visibleItems.some((item) => item.id === current && (option.value === "all" || item.priority === option.value)) ? current : ""); }} className={`min-h-10 rounded-full px-3 text-xs font-extrabold transition active:scale-[.98] ${filter === option.value ? "bg-[#1d402f] text-white" : "bg-[#f1ede5] text-[#5e675c] hover:bg-[#e7f0d6]"}`}>{option.label} {option.count}</button>)}
              </div>
              <div className="mt-3 space-y-2" role="list" aria-label="审核事项">
                {visibleItems.map((item) => {
                  const Icon = kindMeta[item.kind].icon;
                  const active = activeItem?.id === item.id;
                  return <button key={item.id} type="button" role="listitem" onClick={() => setActiveId(item.id)} className={`group w-full rounded-[18px] border p-3 text-left transition active:scale-[.99] ${active ? "border-[#78aa96] bg-[#edf7f3] shadow-[0_4px_0_rgba(35,107,90,.12)]" : "border-transparent bg-[#fffdfa] hover:border-[#dfd9cd] hover:bg-[#faf6ef]"}`}>
                    <div className="flex items-start gap-2.5"><span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${priorityMeta[item.priority].dot}`} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-[#243226]">{candidateTitle(item)}</span><span className="mt-1 block truncate text-xs text-[#737a71]">{item.companyName}</span></span><Icon className="mt-0.5 size-4 shrink-0 text-[#628172]" aria-hidden="true" /></div>
                    <span className="mt-2 block text-xs font-bold text-[#6e756c]">{kindMeta[item.kind].label}</span>
                  </button>;
                })}
              </div>
            </aside>

            {activeItem && <ReviewForm item={activeItem} draft={drafts[activeItem.id] ?? { decision: "", evidenceUrl: "", notes: "" }} reviewer={reviewer} selectedCount={selectedCount} onReviewerChange={setReviewer} onDraftChange={(patch) => updateDraft(activeItem.id, patch)} onExport={exportDecisions} onCopyCommand={copyCommand} notice={notice} errors={errors} errorSummaryRef={errorSummaryRef} />}
          </div>
        )}
      </section>
    </main>
  );
}

function ReviewForm({ item, draft, reviewer, selectedCount, onReviewerChange, onDraftChange, onExport, onCopyCommand, notice, errors, errorSummaryRef }: { item: SourceReviewItem; draft: DecisionDraft; reviewer: string; selectedCount: number; onReviewerChange: (value: string) => void; onDraftChange: (patch: Partial<DecisionDraft>) => void; onExport: () => void; onCopyCommand: () => void; notice: string; errors: string[]; errorSummaryRef: React.RefObject<HTMLDivElement | null> }) {
  const Icon = kindMeta[item.kind].icon;
  const meta = priorityMeta[item.priority];
  const evidenceRequired = requiresEvidence(draft.decision);
  const targetHost = new URL(item.source.portalUrl).hostname;

  return <section className="overflow-hidden rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_10px_0_rgba(47,69,44,.06)]" aria-labelledby="review-item-title">
    <div className="border-b border-[#ded8cd] bg-[#fcf6ec] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#1d402f] text-white"><Icon className="size-5" aria-hidden="true" /></span><div><p className="eyebrow text-[#c94a34]">{kindMeta[item.kind].label}</p><h2 id="review-item-title" className="company-entry-title mt-1 text-2xl text-[#172319]">{candidateTitle(item)}</h2><p className="mt-1 text-sm text-[#627064]">{item.companyName} · {item.companyId}</p></div></div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${meta.badge}`}><span className={`size-2 rounded-full ${meta.dot}`} aria-hidden="true" />{meta.label}</span></div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><InfoBlock label="扫描结果" value={item.scan?.result || "未运行"} /><InfoBlock label="扫描时间" value={dateLabel(item.scan?.scannedAt || "")} /><InfoBlock label="来源模式" value={item.source.mode === "manual-review-required" ? "人工复核后使用" : item.source.mode} /></div>
    </div>

    <div className="grid gap-7 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)]">
      <div className="space-y-6">
        <div className="rounded-[20px] border border-[#e4dccf] bg-[#fffefa] p-4"><p className="playful-label text-[#236b5a]">WHY IT IS HERE</p><p className="mt-2 text-sm leading-7 text-[#4f5d52]">{item.scan?.reason || "该来源尚未生成可供审核的扫描报告。"}</p></div>
        <div><h3 className="company-entry-title text-xl">建议怎么核对？</h3><p className="mt-2 text-sm leading-7 text-[#536154]">{item.recommendedAction}</p><div className="mt-3 rounded-2xl bg-[#fff1d9] px-4 py-3 text-sm leading-6 text-[#7e5b22]"><strong>证据要求：</strong>{item.requiredEvidence}</div></div>
        <a href={item.source.portalUrl} target="_blank" rel="noreferrer" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ee6145] px-4 text-sm font-extrabold text-white shadow-[0_5px_0_#ba422d] transition hover:-translate-y-0.5 hover:bg-[#d94f35] hover:shadow-[0_6px_0_#ba422d] active:translate-y-0 active:shadow-[0_2px_0_#ba422d]">打开官方来源 <ExternalLink className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></a>
        <p className="-mt-4 text-xs leading-5 text-[#74796f]">即将打开：{targetHost}。请人工确认页面内容；不要绕过登录、验证码或访问限制。</p>
      </div>

      <form className="rounded-[23px] border border-[#d9d1c3] bg-[#f7f3ea] p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onExport(); }} noValidate>
        <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#236b5a]" aria-hidden="true" /><h3 className="company-entry-title text-xl">填写审核决定</h3></div>
        <p className="mt-2 text-xs leading-5 text-[#697066]">当前已填写 {selectedCount} 项。导出的是本地 JSON 文件，不会提交到服务器。</p>
        <label className="mt-5 block text-sm font-extrabold text-[#314234]" htmlFor="reviewer">审核人 <span className="text-[#c94a34]">*</span></label>
        <input id="reviewer" value={reviewer} onChange={(event) => onReviewerChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7cec0] bg-white px-3 text-sm outline-none transition placeholder:text-[#9a9a91] focus:border-[#75a992] focus:ring-3 focus:ring-[#d9eee3]" placeholder="例如：小张" autoComplete="name" />

        <fieldset className="mt-5"><legend className="text-sm font-extrabold text-[#314234]">本项决定</legend><div className="mt-2 grid gap-2">{item.allowedDecisions.map((decision) => { const data = decisionLabels[decision] ?? { label: decision, hint: "", tone: "border-[#d7cec0] bg-white text-[#3f4b41]" }; const selected = draft.decision === decision; return <label key={decision} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${selected ? data.tone : "border-[#dcd4c7] bg-white text-[#566055] hover:border-[#b8cfbf]"}`}><input type="radio" name={`decision-${item.id}`} value={decision} checked={selected} onChange={() => onDraftChange({ decision })} className="size-4 accent-[#236b5a]" /><span><span className="block text-sm font-extrabold">{data.label}</span><span className="block text-xs text-current/70">{data.hint}</span></span></label>; })}</div></fieldset>

        <label className="mt-5 block text-sm font-extrabold text-[#314234]" htmlFor={`evidence-${item.id}`}>官方证据链接 {evidenceRequired && <span className="text-[#c94a34]">*</span>}</label>
        <input id={`evidence-${item.id}`} type="url" value={draft.evidenceUrl} onChange={(event) => onDraftChange({ evidenceUrl: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7cec0] bg-white px-3 text-sm outline-none transition placeholder:text-[#9a9a91] focus:border-[#75a992] focus:ring-3 focus:ring-[#d9eee3]" placeholder={`https://${targetHost}/...`} inputMode="url" />
        <p className="mt-1.5 text-xs leading-5 text-[#757c72]">需要证据的决定只能使用允许的官方来源域名，命令校验会再次检查。</p>

        <label className="mt-5 block text-sm font-extrabold text-[#314234]" htmlFor={`notes-${item.id}`}>判断说明 <span className="text-[#c94a34]">*</span></label>
        <textarea id={`notes-${item.id}`} value={draft.notes} onChange={(event) => onDraftChange({ notes: event.target.value })} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[#d7cec0] bg-white px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-[#9a9a91] focus:border-[#75a992] focus:ring-3 focus:ring-[#d9eee3]" placeholder="写下你看到了什么、为何作出这个决定。至少 8 个字符。" />

        {errors.length > 0 && <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="mt-4 rounded-xl border border-[#efb4a8] bg-[#fff0ec] p-3 text-sm text-[#963b2e]"><p className="font-extrabold">还不能导出，请补充：</p><ul className="mt-1.5 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        {notice && <p className="mt-4 rounded-xl bg-[#e7f0d6] px-3 py-2.5 text-sm leading-6 text-[#315b37]" aria-live="polite">{notice}</p>}

        <button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d402f] px-4 text-sm font-extrabold text-white shadow-[0_5px_0_#10291b] transition hover:-translate-y-0.5 hover:bg-[#2a523c] hover:shadow-[0_6px_0_#10291b] active:translate-y-0 active:shadow-[0_2px_0_#10291b]"><Download className="size-4" aria-hidden="true" />导出审核决定文件</button>
        <button type="button" onClick={onCopyCommand} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfc5b6] bg-white px-4 text-sm font-extrabold text-[#405246] transition hover:bg-[#edf7f3] active:scale-[.99]"><Copy className="size-4" aria-hidden="true" />复制校验命令</button>
        <p className="mt-4 border-t border-dashed border-[#d7cec0] pt-4 text-xs leading-5 text-[#70776c]">导出后：将文件保存为 <code className="rounded bg-[#e8e1d5] px-1 py-0.5">data/generated/source-reviews/decisions.json</code>，再运行校验。不会自动更新职位或企业数据。</p>
      </form>
    </div>

    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#d8cfbf] bg-[#fffaf4] px-5 py-4 text-xs text-[#6c7469] sm:px-6"><span>队列生成于 {dateLabel(item.scan?.scannedAt || "")}</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#4b7c45]" aria-hidden="true" />仅生成可追溯决定，不自动写入</span></footer>
  </section>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/75 px-3 py-2.5"><p className="text-xs font-bold text-[#7a8076]">{label}</p><p className="mt-1 truncate text-sm font-extrabold text-[#344236]" title={value}>{value}</p></div>;
}



