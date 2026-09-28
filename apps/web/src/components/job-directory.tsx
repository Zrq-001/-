"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, ChevronRight, Filter, MapPin, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { SaveButton } from "@/components/save-button";
import type { Job } from "@/data/catalog";

function safeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "企业招聘入口";
  }
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const keyword = query.trim();
  if (!keyword) return text;
  const expression = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return text.split(expression).map((part, index) => part.toLocaleLowerCase() === keyword.toLocaleLowerCase()
    ? <mark key={`${part}-${index}`} className="rounded bg-[#ffe3a3] px-0.5 text-inherit">{part}</mark>
    : part);
}

type Suggestion = { key: string; kind: "职位" | "企业" | "方向"; value: string; detail: string };
const PAGE_SIZE = 24;

export function JobDirectory({ initialJobs, initialFilters = {} }: { initialJobs: Job[]; initialFilters?: { q?: string; function?: string; type?: string; direct?: string; official?: string; sort?: string } }) {
  const [query, setQuery] = useState(() => initialFilters.q ?? "");
  const [functionName, setFunctionName] = useState(() => initialFilters.function ?? "全部职能");
  const [recruitmentType, setRecruitmentType] = useState(() => initialFilters.type ?? "全部招聘类型");
  const [directOnly, setDirectOnly] = useState(() => initialFilters.direct === "1");
  const [officialOnly, setOfficialOnly] = useState(() => initialFilters.official === "1");
  const [sortOrder, setSortOrder] = useState(() => initialFilters.sort ?? "priority");
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button")) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (functionName !== "全部职能") params.set("function", functionName);
    if (recruitmentType !== "全部招聘类型") params.set("type", recruitmentType);
    if (directOnly) params.set("direct", "1");
    if (officialOnly) params.set("official", "1");
    if (sortOrder !== "priority") params.set("sort", sortOrder);
    const href = `/jobs${params.size ? `?${params.toString()}` : ""}`;
    if (window.location.pathname + window.location.search !== href) window.history.replaceState(null, "", href);
  }, [directOnly, functionName, officialOnly, query, recruitmentType, sortOrder]);

  const functionOptions = useMemo(() => ["全部职能", ...Array.from(new Set(initialJobs.map((job) => job.function).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"))], [initialJobs]);
  const recruitmentOptions = useMemo(() => ["全部招聘类型", ...Array.from(new Set(initialJobs.map((job) => job.recruitmentType).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"))], [initialJobs]);
  const popularFunctions = functionOptions.slice(1, 6);
  const suggestions = useMemo<Suggestion[]>(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    const matches = (value: string) => value.toLocaleLowerCase().includes(normalized);
    const result: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (suggestion: Suggestion) => {
      if (!seen.has(suggestion.key) && result.length < 6) {
        seen.add(suggestion.key);
        result.push(suggestion);
      }
    };

    initialJobs.filter((job) => matches(job.title) || matches(job.companyName)).slice(0, 3).forEach((job) => add({ key: `job:${job.key}`, kind: "职位", value: job.title, detail: job.companyName }));
    Array.from(new Set(initialJobs.map((job) => job.companyName))).filter(matches).slice(0, 2).forEach((companyName) => add({ key: `company:${companyName}`, kind: "企业", value: companyName, detail: "查看这家企业的职位线索" }));
    Array.from(new Set(initialJobs.flatMap((job) => [job.function, job.industry]).filter(Boolean))).filter(matches).slice(0, 2).forEach((direction) => add({ key: `direction:${direction}`, kind: "方向", value: direction, detail: "按方向继续筛选" }));
    return result;
  }, [initialJobs, query]);

  const jobs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = initialJobs.filter((job) => {
      const matchesQuery = !normalizedQuery || [job.title, job.companyName, job.industry, job.function, job.location].join(" ").toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery
        && (functionName === "全部职能" || job.function === functionName)
        && (recruitmentType === "全部招聘类型" || job.recruitmentType === recruitmentType)
        && (!directOnly || job.isDirectDetail)
        && (!officialOnly || job.isOfficial);
    });
    return filtered.sort((a, b) => {
      if (sortOrder === "recent") return (b.verifiedAt || "").localeCompare(a.verifiedAt || "") || a.companyName.localeCompare(b.companyName, "zh-CN");
      if (sortOrder === "company") return a.companyName.localeCompare(b.companyName, "zh-CN") || a.title.localeCompare(b.title, "zh-CN");
      if (sortOrder === "title") return a.title.localeCompare(b.title, "zh-CN") || a.companyName.localeCompare(b.companyName, "zh-CN");
      return Number(b.isDirectDetail) - Number(a.isDirectDetail) || Number(b.isOfficial) - Number(a.isOfficial) || (b.verifiedAt || "").localeCompare(a.verifiedAt || "") || a.companyName.localeCompare(b.companyName, "zh-CN");
    });
  }, [directOnly, functionName, initialJobs, officialOnly, query, recruitmentType, sortOrder]);

  const visibleJobs = jobs.slice(0, visibleCount);

  const hasFilters = Boolean(query) || functionName !== "全部职能" || recruitmentType !== "全部招聘类型" || directOnly || officialOnly;
  const reset = () => { setQuery(""); setFunctionName("全部职能"); setRecruitmentType("全部招聘类型"); setDirectOnly(false); setOfficialOnly(false); setSortOrder("priority"); setSearchOpen(false); };
  const chooseSuggestion = (value: string) => { setQuery(value); setSearchOpen(false); };

  return (
    <section aria-label="职位筛选和列表" className="pb-16">
      <div className="rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_10px_30px_rgba(46,51,38,.06)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_176px_176px_auto]">
          <div className="relative">
            <label className="relative block">
              <span className="sr-only">搜索职位或企业</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#ee6145]" />
              <input ref={searchInputRef} aria-keyshortcuts="/" value={query} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} placeholder="搜索岗位、企业或行业，例如：前端、游戏、AI" className="min-h-13 w-full rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] py-2 pl-12 pr-4 text-[16px] font-medium text-[#172319] outline-none transition focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]" />
            </label>
            {searchOpen && suggestions.length > 0 && <div id="job-search-suggestions" role="listbox" aria-label="搜索建议" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#ded8cd] bg-[#fffdfa] p-1.5 shadow-[0_12px_30px_rgba(46,51,38,.14)]">
              <p className="px-3 pb-1 pt-1.5 text-xs font-bold text-[#788174]">试试这些匹配项</p>
              {suggestions.map((suggestion) => <button key={suggestion.key} type="button" role="option" aria-selected={false} onMouseDown={(event) => { event.preventDefault(); chooseSuggestion(suggestion.value); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#edf3e4]">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-black ${suggestion.kind === "职位" ? "bg-[#fff0df] text-[#c94a34]" : "bg-[#e4f1e8] text-[#236b5a]"}`}>{suggestion.kind}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#172319]"><HighlightMatch text={suggestion.value} query={query} /></span><span className="block truncate text-xs text-[#6c7169]">{suggestion.detail}</span></span>
                <ChevronRight className="ml-auto size-4 shrink-0 text-[#9aa297]" />
              </button>)}
            </div>}
          </div>
          <label className="sr-only" htmlFor="job-function">职能类别</label><select id="job-function" value={functionName} onChange={(event) => setFunctionName(event.target.value)} className="min-h-13 rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]">{functionOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="job-type">招聘类型</label><select id="job-type" value={recruitmentType} onChange={(event) => setRecruitmentType(event.target.value)} className="min-h-13 rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]">{recruitmentOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <button type="button" onClick={() => setDirectOnly((current) => !current)} aria-pressed={directOnly} className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition ${directOnly ? "border-[#1d402f] bg-[#1d402f] text-white" : "border-[#ded8cd] bg-white text-[#526052] hover:border-[#236b5a]"}`}><Filter className="size-4" />只看直达详情</button>
          <label className="sr-only" htmlFor="job-sort">排序方式</label><div className="relative"><ArrowDownUp className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#236b5a]" /><select id="job-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="min-h-13 w-full appearance-none rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] pl-10 pr-8 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]"><option value="priority">官方直达优先</option><option value="recent">最近核验</option><option value="company">按企业名称</option><option value="title">按职位名称</option></select></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#ded8cd] pt-4">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-[#6c7169]">快速筛选：</span>{popularFunctions.map((item) => <button type="button" key={item} onClick={() => setFunctionName(functionName === item ? "全部职能" : item)} className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${functionName === item ? "bg-[#e4f1e8] text-[#236b5a]" : "bg-[#f0ece4] text-[#657064] hover:bg-[#e7f0d6]"}`}>{functionName === item && <Check className="mr-1 inline size-3.5" />}{item}</button>)}<button type="button" onClick={() => setOfficialOnly((current) => !current)} aria-pressed={officialOnly} className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${officialOnly ? "bg-[#236b5a] text-white" : "bg-[#eef3ed] text-[#42604d] hover:bg-[#dceee8]"}`}><ShieldCheck className="size-3.5" />官方来源优先</button></div>
          <CopyLinkButton />{hasFilters && <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#c94a34] hover:bg-[#fff0ec]"><X className="size-4" />清空条件</button>}
        </div>
      </div>

      <div className="mt-7 flex flex-col justify-between gap-4 border-b border-[#ded8cd] pb-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow text-[#ee6145]">RESULTS</p><h2 className="company-entry-title mt-1 text-2xl text-[#172319]">{query.trim() ? <><mark className="rounded bg-[#ffe3a3] px-1 text-inherit">{query.trim()}</mark> 相关的 {jobs.length} 条线索</> : `找到 ${jobs.length} 条线索`}</h2></div>
        <p className="max-w-md text-sm leading-6 text-[#6c7169]"><ShieldCheck className="mr-1 inline size-4 text-[#236b5a]" />优先展示官方招聘入口或可直达职位页；每条都保留来源和最近核验日期。</p>
      </div>

      {jobs.length > 0 ? <div className="mt-4 grid gap-3">
        {visibleJobs.map((job, index) => <article key={job.key} className="group relative grid gap-4 overflow-hidden rounded-[23px] border border-[#ded8cd] bg-[#fffdfa] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#aec7b5] hover:shadow-[0_13px_28px_rgba(46,51,38,.09)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className={`hidden size-12 place-items-center rounded-2xl text-sm font-extrabold sm:grid ${job.isDirectDetail ? "bg-[#fff0c9] text-[#a7710e]" : "bg-[#e4f1e8] text-[#236b5a]"}`}>{String(index + 1).padStart(2, "0")}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${job.isDirectDetail ? "bg-[#fff0c9] text-[#8b5b09]" : "bg-[#e4f1e8] text-[#236b5a]"}`}>{job.isDirectDetail ? "直达职位详情" : "官方招聘列表"}</span>{job.isOfficial ? <span className="inline-flex items-center gap-1 text-xs font-bold text-[#236b5a]"><ShieldCheck className="size-3.5" />官方来源</span> : <span className="text-xs font-bold text-[#9b531f]">来源待核验</span>}</div><h3 className="company-entry-title mt-2 text-xl leading-tight text-[#172319]"><Link href={`/jobs/${encodeURIComponent(job.key)}`} className="rounded outline-none hover:text-[#ee6145] focus-visible:ring-3 focus-visible:ring-[#ee6145]/30"><HighlightMatch text={job.title} query={query} /></Link></h3><p className="mt-1 text-sm font-bold text-[#526052]"><HighlightMatch text={job.companyName} query={query} /></p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#757a72]"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-[#ee6145]" />{job.location || "成都"}</span><span className="inline-flex items-center gap-1"><BriefcaseBusiness className="size-3.5 text-[#236b5a]" />{job.function || "职能待补充"}</span><span>{job.recruitmentType || "招聘类型待补充"}</span><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />核验 {job.verifiedAt || "待补充"}</span></div></div>
          <div className="flex flex-row gap-2 sm:flex-col sm:items-end"><SaveButton itemId={`job:${job.key}`} label={job.title} compact /><a href={job.isDirectDetail ? job.applyUrl : job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1d402f] px-3.5 text-sm font-extrabold text-white shadow-[0_4px_0_#123227] transition hover:-translate-y-0.5 hover:bg-[#236b5a] hover:shadow-[0_5px_0_#123227] active:translate-y-[2px] active:shadow-[0_2px_0_#123227]">前往{job.isDirectDetail ? "职位" : "入口"}<ArrowUpRight className="size-4" /></a><span className="hidden max-w-40 truncate text-xs text-[#969990] sm:block">{safeDomain(job.sourceUrl)}</span></div>
        </article>)}
      {visibleJobs.length < jobs.length && <div className="mt-6 flex justify-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="inline-flex min-h-11 items-center rounded-full border border-[#1d402f] bg-[#fffdfa] px-5 text-sm font-extrabold text-[#1d402f] transition hover:-translate-y-0.5 hover:bg-[#e7f0d6]">再看 {Math.min(PAGE_SIZE, jobs.length - visibleJobs.length)} 条</button></div>}</div> : <div className="mt-5 rounded-[28px] border border-dashed border-[#c9c1b4] bg-[#fffdfa] px-6 py-16 text-center"><Sparkles className="mx-auto size-8 text-[#ee6145]" /><h2 className="company-entry-title mt-4 text-2xl text-[#172319]">暂时没找到完全匹配的线索</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6c7169]">可以试试更宽一点的词，例如“研发”“产品”“AI”，或者先在企业地图里找到目标公司。</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={reset} type="button" className="rounded-full bg-[#1d402f] px-4 py-2.5 text-sm font-extrabold text-white">清空条件</button><Link href="/companies" className="inline-flex min-h-10 items-center rounded-full border border-[#1d402f] px-4 text-sm font-extrabold text-[#1d402f]">去找企业 <ChevronRight className="ml-1 size-4" /></Link></div></div>}
    </section>
  );
}


