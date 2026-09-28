"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { CompanyCard } from "@/components/company-card";
import type { Company } from "@/data/catalog";
import { CopyLinkButton } from "@/components/copy-link-button";

const ALL_INDUSTRIES = "全部行业";
const ALL_DISTRICTS = "全部区域";
const ALL_STATUSES = "全部入口状态";
const PAGE_SIZE = 24;

function companySearchText(company: Company) { return [company.name, ...company.aliases, company.industry, company.district, company.officeAddress, company.careerSourceName].filter(Boolean).join(" ").toLocaleLowerCase(); }
function sortCompanies(items: Company[], sortOrder: string) { return [...items].sort((a, b) => { if (sortOrder === "recent") return (b.verifiedAt || "").localeCompare(a.verifiedAt || "") || a.name.localeCompare(b.name, "zh-CN"); if (sortOrder === "jobs") return b.jobSampleCount - a.jobSampleCount || Number(b.isOfficial) - Number(a.isOfficial) || a.name.localeCompare(b.name, "zh-CN"); if (sortOrder === "name") return a.name.localeCompare(b.name, "zh-CN"); if (sortOrder === "active") return Number(b.status === "active") - Number(a.status === "active") || Number(b.isOfficial) - Number(a.isOfficial) || a.name.localeCompare(b.name, "zh-CN"); return Number(b.isOfficial) - Number(a.isOfficial) || Number(b.status === "active") - Number(a.status === "active") || b.jobSampleCount - a.jobSampleCount || a.name.localeCompare(b.name, "zh-CN"); }); }

export function CompanyDirectory({ initialCompanies, initialFilters = {} }: { initialCompanies: Company[]; initialFilters?: { q?: string; industry?: string; district?: string; status?: string; sort?: string } }) {
  const [query, setQuery] = useState(() => initialFilters.q ?? "");
  const [industry, setIndustry] = useState(() => initialFilters.industry ?? ALL_INDUSTRIES);
  const [district, setDistrict] = useState(() => initialFilters.district ?? ALL_DISTRICTS);
  const [status, setStatus] = useState(() => initialFilters.status ?? ALL_STATUSES);
  const [sortOrder, setSortOrder] = useState(() => initialFilters.sort ?? "priority");
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
  useEffect(() => { const params = new URLSearchParams(); if (query) params.set("q", query); if (industry !== ALL_INDUSTRIES) params.set("industry", industry); if (district !== ALL_DISTRICTS) params.set("district", district); if (status !== ALL_STATUSES) params.set("status", status); if (sortOrder !== "priority") params.set("sort", sortOrder); const href = `/companies${params.size ? `?${params.toString()}` : ""}`; if (window.location.pathname + window.location.search !== href) window.history.replaceState(null, "", href); }, [district, industry, query, sortOrder, status]);

  const industries = useMemo(() => [ALL_INDUSTRIES, ...Array.from(new Set(initialCompanies.map((company) => company.industry).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"))], [initialCompanies]);
  const districts = useMemo(() => [ALL_DISTRICTS, ...Array.from(new Set(initialCompanies.map((company) => company.district).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"))], [initialCompanies]);
  const statuses = useMemo(() => { const seen = new Map<string, string>(); initialCompanies.forEach((company) => seen.set(company.status, company.statusLabel)); return [{ value: ALL_STATUSES, label: ALL_STATUSES }, ...Array.from(seen.entries()).map(([value, label]) => ({ value, label }))]; }, [initialCompanies]);
  const companies = useMemo(() => { const normalizedQuery = query.trim().toLocaleLowerCase(); return sortCompanies(initialCompanies.filter((company) => (!normalizedQuery || companySearchText(company).includes(normalizedQuery)) && (industry === ALL_INDUSTRIES || company.industry === industry) && (district === ALL_DISTRICTS || company.district === district) && (status === ALL_STATUSES || company.status === status)), sortOrder); }, [district, industry, initialCompanies, query, sortOrder, status]);

  const visibleCompanies = companies.slice(0, visibleCount);

  const hasFilters = Boolean(query) || industry !== ALL_INDUSTRIES || district !== ALL_DISTRICTS || status !== ALL_STATUSES;
  const reset = () => { setQuery(""); setIndustry(ALL_INDUSTRIES); setDistrict(ALL_DISTRICTS); setStatus(ALL_STATUSES); setSortOrder("priority"); };

  return <section className="pb-16" aria-label="企业筛选和列表"><div className="rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_10px_30px_rgba(46,51,38,.06)] sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_210px]"><label className="relative block"><span className="sr-only">搜索企业、行业或区域</span><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#ee6145]" /><input ref={searchInputRef} aria-keyshortcuts="/" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索企业、行业或区域，例如：AI、高新区、游戏" className="min-h-13 w-full rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] py-2 pl-12 pr-4 text-[16px] font-medium text-[#172319] outline-none transition focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]" /></label><label className="sr-only" htmlFor="company-industry">行业</label><select id="company-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className="min-h-13 rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]">{industries.map((item) => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="company-district">区域</label><select id="company-district" value={district} onChange={(event) => setDistrict(event.target.value)} className="min-h-13 rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]">{districts.map((item) => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="company-status">招聘入口状态</label><select id="company-status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-13 rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]">{statuses.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
          <label className="sr-only" htmlFor="company-sort">排序方式</label><div className="relative"><ArrowDownUp className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#236b5a]" /><select id="company-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="min-h-13 w-full appearance-none rounded-2xl border border-[#ded8cd] bg-[#fcfaf6] pl-10 pr-8 text-sm font-bold text-[#425244] outline-none focus:border-[#ee6145] focus:ring-4 focus:ring-[#ffe4dc]"><option value="priority">官方入口优先</option><option value="active">有效入口优先</option><option value="recent">最近核验</option><option value="jobs">职位样本多</option><option value="name">按企业名称</option></select></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#ded8cd] pt-4"><p className="text-sm font-bold text-[#6c7169]"><SlidersHorizontal className="mr-1.5 inline size-4 text-[#236b5a]" />找到 <strong className="text-[#172319]">{companies.length}</strong> 家企业</p><CopyLinkButton />{hasFilters && <button onClick={reset} type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#c94a34] hover:bg-[#fff0ec]"><X className="size-4" />清空条件</button>}</div></div><div className="mt-7 flex flex-col justify-between gap-4 border-b border-[#ded8cd] pb-4 sm:flex-row sm:items-end"><p className="max-w-2xl text-sm leading-6 text-[#657064]"><ShieldCheck className="mr-1 inline size-4 text-[#236b5a]" />企业官网和企业专属 ATS 会优先展示；如只有第三方招聘线索，我们会直接标为“第三方线索”，不包装成官方直招。</p><div className="flex gap-2"><span className="rounded-full bg-[#dceee8] px-2.5 py-1 text-xs font-extrabold text-[#236b5a]">官方入口</span><span className="rounded-full bg-[#fff0df] px-2.5 py-1 text-xs font-extrabold text-[#9b531f]">待核验线索</span></div></div>{companies.length > 0 ? <div className="relative mt-6 max-w-6xl space-y-4 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-[#d5dfcc] sm:before:left-8">{visibleCompanies.map((company, index) => <CompanyCard company={company} index={index} key={company.id} />)}{visibleCompanies.length < companies.length && <div className="mt-6 flex justify-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="inline-flex min-h-11 items-center rounded-full border border-[#1d402f] bg-[#fffdfa] px-5 text-sm font-extrabold text-[#1d402f] transition hover:-translate-y-0.5 hover:bg-[#e7f0d6]">再看 {Math.min(PAGE_SIZE, companies.length - visibleCompanies.length)} 家</button></div>}</div> : <div className="mt-5 rounded-[28px] border border-dashed border-[#c9c1b4] bg-[#fffdfa] px-6 py-16 text-center"><Search className="mx-auto size-8 text-[#ee6145]" /><h2 className="mt-4 text-xl font-extrabold text-[#172319]">这里暂时还没有匹配的企业</h2><p className="mt-2 text-sm text-[#6c7169]">换个关键词，或清掉筛选再找找看。</p><button onClick={reset} type="button" className="mt-5 rounded-full bg-[#1d402f] px-4 py-2.5 text-sm font-extrabold text-white">清空条件</button></div>}</section>;
}




