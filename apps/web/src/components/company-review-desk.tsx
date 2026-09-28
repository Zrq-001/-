"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  Filter,
  ListChecks,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { CompanyReviewPriority, CompanyReviewQueue, CompanyReviewRecord } from "@/lib/company-review";

type FilterValue = "all" | CompanyReviewPriority;
type ModeFilter = "all" | "automation_candidate" | "manual_first";

const priorityMeta: Record<CompanyReviewPriority, { label: string; compact: string; dot: string; panel: string }> = {
  high: { label: "优先处理", compact: "优先", dot: "bg-[#ed6044]", panel: "border-[#f0b1a4] bg-[#fff0eb] text-[#9d3d2e]" },
  medium: { label: "本轮安排", compact: "本轮", dot: "bg-[#e9a339]", panel: "border-[#efd092] bg-[#fff6dc] text-[#8c5a10]" },
  low: { label: "计划复核", compact: "计划", dot: "bg-[#7ba75e]", panel: "border-[#c4d9b0] bg-[#edf5e6] text-[#39652f]" },
};

const stateMeta: Record<CompanyReviewRecord["state"], { label: string; description: string }> = {
  missing_verification: { label: "缺少验证记录", description: "还没有可追溯的验证日期。" },
  missing_public_entry: { label: "缺少公开入口", description: "标为有效，但没有公开招聘入口。" },
  overdue: { label: "已超过复核日", description: "应优先完成一次人工复核。" },
  due_soon: { label: "即将到期", description: "建议在近期安排检查。" },
  scheduled: { label: "按计划复核", description: "当前仍在已排期的复核周期内。" },
};

function sourceTierLabel(value: string) {
  const labels: Record<string, string> = {
    official_ats: "企业专属 ATS",
    official_company: "企业官网招聘页",
    group_career_site: "集团招聘入口",
    official_wechat: "官方微信招聘",
    official_announcement: "官方公告",
    third_party_lead: "第三方线索",
    search_evidence_only: "搜索线索待核验",
    unknown: "来源待核验",
  };
  return labels[value] ?? (value || "来源待补充");
}

function dateLabel(value: string | null) {
  if (!value) return "尚未记录";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

function dueLabel(record: CompanyReviewRecord) {
  if (record.daysUntilDue === null) return "等待首次验证";
  if (record.daysUntilDue < 0) return `已逾期 ${Math.abs(record.daysUntilDue)} 天`;
  if (record.daysUntilDue === 0) return "今天应复核";
  return `${record.daysUntilDue} 天后复核`;
}

function isOfficialUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CompanyReviewDesk({ queue }: { queue: CompanyReviewQueue }) {
  const [priority, setPriority] = useState<FilterValue>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(queue.records[0]?.companyId ?? "");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    return queue.records.filter((record) => {
      const matchesPriority = priority === "all" || record.priority === priority;
      const matchesMode = mode === "all" || record.reviewMode === mode;
      const text = `${record.companyName} ${record.companyId} ${record.sourceLabel} ${record.sourceTier}`.toLocaleLowerCase("zh-CN");
      return matchesPriority && matchesMode && (!normalized || text.includes(normalized));
    });
  }, [mode, priority, query, queue.records]);

  const active = filtered.find((record) => record.companyId === activeId) ?? filtered[0] ?? null;
  const setPriorityFilter = (next: FilterValue) => {
    setPriority(next);
    setActiveId("");
  };
  const setModeFilter = (next: ModeFilter) => {
    setMode(next);
    setActiveId("");
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
              <p className="playful-label text-[#236b5a]">RONG XIAO ZHAO / REVIEW PLAN</p>
              <h1 className="company-entry-title truncate text-xl text-[#172319] sm:text-2xl">企业复核排期</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/ops/review" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d9d1c3] bg-white px-3 text-sm font-bold text-[#405246] transition hover:border-[#a6c9b9] hover:bg-[#eff8f4] sm:px-4">
              <ClipboardList className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">来源审核台</span>
            </Link>
            <Link href="/" className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[#d9d1c3] bg-white text-[#405246] transition hover:border-[#a6c9b9] hover:bg-[#eff8f4] sm:hidden" aria-label="回到前台">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="site-grid border-b border-[#ded8cd] bg-[#e8f1dd]">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end lg:px-8 lg:py-11">
          <div>
            <p className="eyebrow text-[#347040]">HUMAN-CENTRED RECHECK PLAN</p>
            <h2 className="display-title mt-2 max-w-3xl text-4xl leading-[.96] text-[#172319] sm:text-5xl">先排好复核顺序，<br />再处理每一条招聘线索。</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526052]">这是企业级复核排期，不是自动爬虫，也不代表岗位已经被自动确认。它帮助维护者把有限时间先放在入口缺失、信息逾期与需人工判断的企业上。</p>
          </div>
          <aside className="rounded-[22px] border border-[#c7d8bb] bg-[#fffdf8] p-4 shadow-[0_7px_0_rgba(65,106,54,.08)]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1d402f] text-white"><ShieldAlert className="size-5" aria-hidden="true" /></span>
              <p className="text-sm leading-6 text-[#596255]"><strong className="text-[#172319]">仅本机运营使用</strong><br />该页面没有登录与权限控制。它只读取本机排期报告，不保存审核结果，也不对外公开。</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="复核排期摘要">
          <Metric label="企业总数" value={queue.summary.totalCompanies} icon={CalendarClock} tone="bg-[#fffdfa]" />
          <Metric label="优先处理" value={queue.summary.highPriority} icon={CircleAlert} tone="bg-[#fff0eb]" accent="text-[#b24735]" />
          <Metric label="可评估适配" value={queue.summary.automationCandidates} icon={Sparkles} tone="bg-[#edf6e7]" accent="text-[#346a35]" />
          <Metric label="默认人工复核" value={queue.summary.manualFirst} icon={ListChecks} tone="bg-[#eef5f1]" accent="text-[#256451]" />
        </div>

        {queue.records.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-[#cfc5b4] bg-[#fffdfa] px-6 py-14 text-center shadow-[0_8px_0_rgba(47,69,44,.05)]">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7f0d6] text-[#236b5a]"><CalendarClock className="size-7" aria-hidden="true" /></span>
            <h2 className="company-entry-title mt-5 text-3xl text-[#172319]">还没有生成复核排期</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#626a61]">请在项目目录生成企业级复核报告。本页不会显示虚构企业或旧样本，避免运营排期被误导。</p>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-[#20392a] px-4 py-3 text-left font-mono text-sm text-[#eef4dc]">pnpm data:review</div>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(285px,.78fr)_minmax(0,1.55fr)]">
            <aside className="rounded-[26px] border border-[#ded8cd] bg-[#fffdfa] p-3 shadow-[0_9px_0_rgba(47,69,44,.05)] lg:sticky lg:top-5 lg:h-[calc(100vh-40px)] lg:max-h-[840px] lg:overflow-hidden">
              <div className="border-b border-dashed border-[#d8cfbf] px-2 pb-3">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Filter className="size-4 text-[#236b5a]" aria-hidden="true" /><h2 className="company-entry-title text-xl">排期队列</h2></div><span className="rounded-full bg-[#e7f0d6] px-2.5 py-1 text-xs font-extrabold text-[#315b37]">{filtered.length} 家</span></div>
                <label className="relative mt-3 block" htmlFor="company-review-search"><span className="sr-only">搜索企业或来源</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6f796e]" aria-hidden="true" /><input id="company-review-search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveId(""); }} className="min-h-11 w-full rounded-xl border border-[#d7cec0] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9a9a91] focus:border-[#75a992] focus:ring-3 focus:ring-[#d9eee3]" placeholder="搜索企业、编号或来源" /></label>
              </div>
              <div className="px-2 pt-3">
                <p className="text-xs font-extrabold text-[#788076]">优先级</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="按优先级筛选">
                  {([{ value: "all", label: "全部" }, { value: "high", label: "优先" }, { value: "medium", label: "本轮" }, { value: "low", label: "计划" }] as const).map((option) => <FilterButton key={option.value} active={priority === option.value} onClick={() => setPriorityFilter(option.value)}>{option.label}</FilterButton>)}
                </div>
                <p className="mt-4 text-xs font-extrabold text-[#788076]">处理方式</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="按处理方式筛选">
                  <FilterButton active={mode === "all"} onClick={() => setModeFilter("all")}>全部</FilterButton>
                  <FilterButton active={mode === "automation_candidate"} onClick={() => setModeFilter("automation_candidate")}>可评估适配</FilterButton>
                  <FilterButton active={mode === "manual_first"} onClick={() => setModeFilter("manual_first")}>人工优先</FilterButton>
                </div>
              </div>
              <div className="mt-3 space-y-1 overflow-y-auto border-t border-dashed border-[#d8cfbf] px-2 pt-3 lg:max-h-[calc(100vh-342px)]">
                {filtered.map((record) => <QueueItem key={record.companyId} record={record} active={active?.companyId === record.companyId} onClick={() => setActiveId(record.companyId)} />)}
                {filtered.length === 0 && <p className="rounded-xl bg-[#f4f1ea] px-3 py-5 text-center text-sm leading-6 text-[#6d756b]">没有符合当前筛选条件的企业。可清除搜索词或放宽筛选。</p>}
              </div>
            </aside>

            {active ? <ReviewDetail record={active} generatedFor={queue.generatedFor} /> : <section className="grid min-h-72 place-items-center rounded-[26px] border border-dashed border-[#cfc5b4] bg-[#fffdfa] p-6 text-center"><div><BadgeCheck className="mx-auto size-9 text-[#6a9560]" aria-hidden="true" /><h2 className="company-entry-title mt-3 text-2xl">选择一项复核安排</h2><p className="mt-2 text-sm leading-6 text-[#697267]">左侧筛选或搜索后，选择企业查看来源状态与本轮清单。</p></div></section>}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, icon: Icon, tone, accent = "text-[#172319]" }: { label: string; value: number; icon: typeof CalendarClock; tone: string; accent?: string }) {
  return <div className={`rounded-[20px] border border-[#ded8cd] p-4 shadow-[0_5px_0_rgba(47,69,44,.05)] ${tone}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#6c7169]">{label}</p><Icon className={`size-4 ${accent}`} aria-hidden="true" /></div><p className={`company-entry-title mt-1 text-3xl ${accent}`}>{value}</p></div>;
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-full px-3 text-xs font-extrabold transition active:scale-[.98] ${active ? "bg-[#1d402f] text-white" : "bg-[#f1ede5] text-[#5e675c] hover:bg-[#e7f0d6]"}`}>{children}</button>;
}

function QueueItem({ record, active, onClick }: { record: CompanyReviewRecord; active: boolean; onClick: () => void }) {
  const meta = priorityMeta[record.priority];
  return <button type="button" onClick={onClick} aria-current={active ? "true" : undefined} className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-[#8fbba8] bg-[#eaf5ef] shadow-[0_3px_0_rgba(49,103,74,.08)]" : "border-transparent hover:border-[#d8d0c2] hover:bg-[#f7f3eb]"}`}>
    <div className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-[#263529]">{record.companyName}</span><span className="mt-1 block truncate text-xs text-[#70776e]">{sourceTierLabel(record.sourceTier)}</span></span><ChevronRight className="mt-1 size-4 shrink-0 text-[#849084]" aria-hidden="true" /></div>
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${meta.panel}`}>{meta.compact}</span><span className="text-[11px] font-bold text-[#778077]">{dueLabel(record)}</span></div>
  </button>;
}

function ReviewDetail({ record, generatedFor }: { record: CompanyReviewRecord; generatedFor: string }) {
  const priority = priorityMeta[record.priority];
  const state = stateMeta[record.state];
  const showsOfficialLink = record.isOfficial && isOfficialUrl(record.careerUrl);

  return <section className="overflow-hidden rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_10px_0_rgba(47,69,44,.05)]">
    <header className="border-b border-[#ded8cd] bg-[#fff5e9] px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="playful-label text-[#b75037]">{record.companyId} / {sourceTierLabel(record.sourceTier)}</p><h2 className="company-entry-title mt-1 text-3xl text-[#172319] sm:text-4xl">{record.companyName}</h2></div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-extrabold ${priority.panel}`}><span className={`size-2 rounded-full ${priority.dot}`} aria-hidden="true" />{priority.label}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Info label="当前状态" value={state.label} /><Info label="上次验证" value={dateLabel(record.verifiedAt)} /><Info label="计划节点" value={record.dueAt ? `${dateLabel(record.dueAt)} · ${dueLabel(record)}` : dueLabel(record)} /></div>
    </header>

    <div className="grid gap-6 px-5 py-6 sm:px-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(250px,.85fr)]">
      <div>
        <div className="rounded-2xl border border-[#e0d7c8] bg-[#fffdf9] p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf5e6] text-[#39652f]"><CircleAlert className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-extrabold text-[#2f4032]">本轮为什么需要处理？</h3><p className="mt-1 text-sm leading-6 text-[#626b60]">{state.description}</p></div></div></div>
        <div className="mt-5"><div className="flex items-center gap-2"><ListChecks className="size-4 text-[#236b5a]" aria-hidden="true" /><h3 className="company-entry-title text-xl">复核清单</h3></div><ol className="mt-3 space-y-2.5">{record.checklist.map((item, index) => <li key={item} className="flex gap-3 rounded-xl bg-[#f6f3ec] px-3 py-3 text-sm leading-6 text-[#536052]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#dcebd4] text-xs font-extrabold text-[#315b37]">{index + 1}</span><span>{item}</span></li>)}</ol></div>
        <div className="mt-5 rounded-2xl border border-dashed border-[#cfddc7] bg-[#f2f8ee] p-4"><p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#4f7944]">建议动作</p><p className="mt-1.5 text-sm leading-6 text-[#36513a]">{record.nextAction}</p></div>
      </div>
      <aside className="space-y-3"><div className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-4"><p className="text-xs font-extrabold text-[#788076]">来源归属</p><p className="mt-1 text-sm font-extrabold text-[#314234]">{record.sourceLabel}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${record.isOfficial ? "bg-[#e7f0d6] text-[#315b37]" : "bg-[#fff0df] text-[#9b5a23]"}`}>{record.isOfficial ? "官方来源已确认" : "非官方线索，需谨慎"}</span><span className="rounded-full bg-[#eef3ef] px-2.5 py-1 text-xs font-extrabold text-[#4c6251]">{record.reviewMode === "automation_candidate" ? "可评估低频适配" : "人工优先"}</span></div></div>
        {showsOfficialLink ? <a href={record.careerUrl!} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d402f] px-4 text-sm font-extrabold text-white shadow-[0_5px_0_#10291b] transition hover:-translate-y-0.5 hover:bg-[#2a523c] hover:shadow-[0_6px_0_#10291b] active:translate-y-0 active:shadow-[0_2px_0_#10291b]"><ExternalLink className="size-4" aria-hidden="true" />打开官方招聘入口</a> : <div className="rounded-xl border border-dashed border-[#d7cec0] bg-[#f7f3eb] p-3 text-sm leading-6 text-[#697267]">{record.isOfficial ? "当前没有可安全展示的官方 HTTPS 招聘入口，请先按清单人工补证。" : "此记录不是官方来源；本页不会把第三方或搜索线索伪装成官方投递入口。"}</div>}
        <Link href={`/companies/${record.companyId}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfc5b6] bg-white px-4 text-sm font-extrabold text-[#405246] transition hover:bg-[#edf7f3] active:scale-[.99]"><ChevronRight className="size-4" aria-hidden="true" />查看前台企业页</Link>
        <p className="border-t border-dashed border-[#d8cfbf] pt-4 text-xs leading-5 text-[#727a70]">排期生成于 {generatedFor || "未知日期"}。<br />{record.isOfficial ? "招聘入口仍需人工判断可用性。" : "第三方线索不得升级为官方来源，除非补到官方证据。"}</p>
      </aside>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#d8cfbf] bg-[#fffaf4] px-5 py-4 text-xs text-[#6c7469] sm:px-6"><span>此处为复核计划，不会自动抓取或修改数据。</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#4b7c45]" aria-hidden="true" />更新仍需人工证据与 CSV 校验</span></footer>
  </section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/75 px-3 py-2.5"><p className="text-xs font-bold text-[#7a8076]">{label}</p><p className="mt-1 text-sm font-extrabold leading-5 text-[#344236]">{value}</p></div>;
}
