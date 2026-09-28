import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Compass, Search, ShieldCheck } from "lucide-react";
import { CompanyDirectory } from "@/components/company-directory";
import { SiteHeader } from "@/components/site-header";
import { companies } from "@/data/catalog";

export const metadata: Metadata = { title: "成都企业招聘入口｜蓉小招", description: "浏览成都企业的官网、官方招聘系统和经标注的招聘线索，保留来源类型与验证状态。" };
type CompanySearchParams = { q?: string | string[]; industry?: string | string[]; district?: string | string[]; status?: string | string[]; sort?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<CompanySearchParams> }) {
  const params = await searchParams;
  const initialFilters = { q: first(params.q), industry: first(params.industry), district: first(params.district), status: first(params.status), sort: first(params.sort) };
  return <><SiteHeader /><main id="main-content"><section className="site-grid border-b border-[#ded8cd] bg-[#fff0df]"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-16"><div><p className="eyebrow text-[#c94a34]">COMPANY MAP / CHENGDU</p><h1 className="display-title mt-3 text-5xl leading-none text-[#172319] sm:text-6xl">先找到想去的公司。</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#526052]">不确定具体岗位也没关系。先逛一逛成都企业的招聘入口，把目标公司、来源等级和核验状态看清楚，再去企业页面找当下的机会。</p></div><div className="rounded-[24px] border border-[#f4cfae] bg-[#fffaf4] p-4"><div className="flex items-start gap-3"><Compass className="mt-0.5 size-5 text-[#ee6145]" /><p className="max-w-52 text-sm leading-6 text-[#526052]"><strong className="text-[#172319]">{companies.length} 家企业</strong><br />按“官方入口优先”排序</p></div></div></div></section><div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"><div className="mb-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-full bg-[#dceee8] px-3 py-2 font-bold text-[#236b5a]"><Building2 className="size-4" />官方来源优先</span><span className="inline-flex items-center gap-2 rounded-full bg-[#f0ece4] px-3 py-2 font-bold text-[#526052]"><ShieldCheck className="size-4" />来源与状态分开标注</span><Link href="/jobs" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1d402f] px-3.5 py-2 font-bold text-white hover:bg-[#236b5a]"><Search className="size-4" />去查岗位</Link></div><CompanyDirectory initialCompanies={companies} initialFilters={initialFilters} /></div></main></>;
}

