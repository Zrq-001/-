import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronRight, Compass, MapPinned, Search, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CompanyCard } from "@/components/company-card";
import { SiteHeader } from "@/components/site-header";
import { activeCompanies, catalogMeta, companies, jobs } from "@/data/catalog";

const quickSearches = ["前端", "AI", "游戏", "产品经理", "高新区"];

export default function Home() {
  const featuredCompanies = [...activeCompanies].sort((a, b) => b.jobSampleCount - a.jobSampleCount || a.name.localeCompare(b.name, "zh-CN")).slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="site-grid relative isolate overflow-hidden border-b border-[#ded8cd] bg-[#f8f5ef]">
          <div className="pointer-events-none absolute -left-22 top-10 size-80 rounded-full bg-[#f7cd72]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-25 bottom-0 size-105 rounded-full bg-[#afd2bf]/25 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-13 sm:px-6 sm:pb-20 sm:pt-18 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8 lg:py-22">
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#cad9c0] bg-[#f5fbef] px-3 py-1.5 text-xs font-extrabold text-[#236b5a]"><Sparkles className="size-3.5" />成都企业招聘入口查询工具</p>
              <h1 className="display-title mt-6 max-w-3xl text-[3.45rem] leading-[.96] text-[#172319] sm:text-7xl">想在成都找工作？<br /><span className="text-[#ee6145]">先找对入口。</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#526052]">蓉小招帮你把散落在企业官网、校招页和官方招聘系统里的招聘信息，整理成一个<strong className="font-extrabold text-[#172319]">可查、可点、可核验</strong>的成都求职地图。</p>
              <form action="/jobs" className="mt-8 max-w-2xl rounded-[22px] border border-[#172319] bg-white p-2 shadow-[8px_8px_0_#1d402f]">
                <label className="sr-only" htmlFor="hero-search">搜索岗位、企业或方向</label>
                <div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#ee6145]" /><input id="hero-search" name="q" className="min-h-13 w-full rounded-2xl border-0 bg-transparent py-3 pl-12 pr-3 text-[16px] font-medium text-[#172319] outline-none placeholder:text-[#97968f]" placeholder="搜岗位、企业、行业，例如：AI、游戏、前端" /></div><button className="button-type min-h-13 rounded-2xl bg-[#ee6145] px-6 font-extrabold text-white transition hover:bg-[#d94f35]" type="submit">开始查找 <ArrowRight className="ml-1 inline size-4" /></button></div>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm"><span className="font-bold text-[#6c7169]">大家在搜：</span>{quickSearches.map((item) => <Link key={item} href={`/jobs?q=${encodeURIComponent(item)}`} className="rounded-full border border-[#ded8cd] bg-[#fffdfa]/80 px-3 py-1.5 font-bold text-[#526052] transition hover:border-[#ee6145] hover:bg-[#fff0ec] hover:text-[#c94a34]">{item}</Link>)}</div>
              <p className="mt-8 flex items-center gap-2 text-sm font-medium text-[#657064]"><BadgeCheck className="size-4 text-[#236b5a]" />不是招聘信息搬运站：每条线索都带来源和最近核验日期。</p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="float-card relative overflow-hidden rounded-[34px] border-2 border-[#172319] bg-[#1d402f] px-6 pb-7 pt-6 text-white shadow-[14px_14px_0_#f6c95b] sm:px-8">
                <div className="absolute -right-8 -top-10 size-44 rounded-full border-[20px] border-[#8bc7a8]/30" />
                <div className="relative flex items-center justify-between"><span className="eyebrow text-[#bcd9c3]">CHENGDU JOB SIGNAL</span><BrandMark className="size-9" /></div>
                <h2 className="relative mt-7 text-3xl font-extrabold tracking-[-.06em]">成都求职信号站</h2>
                <p className="relative mt-2 max-w-xs text-sm leading-6 text-[#d4e7d6]">从“我想找什么”到“该去哪投”，把第一步走得更省心。</p>
                <div className="relative mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><p className="text-2xl font-extrabold">{catalogMeta.companyCount}</p><p className="mt-1 text-xs text-[#c8dfcc]">家企业已定位</p></div><div className="rounded-2xl bg-[#ee6145] p-3"><p className="text-2xl font-extrabold">{catalogMeta.officialActiveCompanyCount}</p><p className="mt-1 text-xs text-white/80">个有效官方入口</p></div></div>
                <div className="relative mt-5 space-y-2 rounded-2xl border border-white/15 bg-black/10 p-3"><p className="flex items-center gap-2 text-xs font-bold"><span className="signal-pulse size-2 rounded-full bg-[#f6c95b]" />刚刚核验过的招聘入口</p><p className="text-sm text-[#eaf4ea]">官方入口、第三方线索、待核验信息，统统分开说清楚。</p></div>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden w-48 rounded-3xl border border-[#ded8cd] bg-[#fffdfa] p-4 shadow-[0_16px_35px_rgba(46,51,38,.13)] sm:block"><div className="flex items-center gap-2 text-[#236b5a]"><MapPinned className="size-5" /><span className="text-sm font-extrabold">不只搜岗位</span></div><p className="mt-2 text-xs leading-5 text-[#6c7169]">也能先找想去的公司，再跳转官方招聘入口。</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[.78fr_1.22fr] lg:items-start"><div><p className="eyebrow text-[#ee6145]">HOW IT WORKS</p><h2 className="display-title mt-3 max-w-sm text-4xl leading-tight text-[#172319]">不是“海投”，<br />是先找到门。</h2><p className="mt-5 max-w-sm text-base leading-7 text-[#657064]">职位少也不藏着掖着。我们把已有的信息、来源等级和还没解析的部分都标出来，让你判断下一步要不要点进去。</p><Link href="/companies" className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#e7f0d6] px-4 text-sm font-extrabold text-[#1d402f] transition hover:bg-[#dce9c7]">先逛企业地图 <ChevronRight className="size-4" /></Link></div>
          <div className="overflow-hidden rounded-[28px] border border-[#ded8cd] bg-[#fffdfa]"><div className="grid divide-y divide-[#e5ded3]"><div className="grid gap-4 p-5 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:p-6"><span className="grid size-12 place-items-center rounded-2xl bg-[#fff0ec] font-extrabold text-[#ee6145]">01</span><div><h3 className="font-extrabold text-[#172319]">搜一个你关心的方向</h3><p className="mt-1 text-sm text-[#6c7169]">岗位、公司、行业、区域都能搜。</p></div><Search className="size-6 text-[#ee6145]" /></div><div className="grid gap-4 p-5 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:p-6"><span className="grid size-12 place-items-center rounded-2xl bg-[#e4f1e8] font-extrabold text-[#236b5a]">02</span><div><h3 className="font-extrabold text-[#172319]">先看来源，再决定点不点</h3><p className="mt-1 text-sm text-[#6c7169]">官方入口、第三方线索、待核验分别标示。</p></div><ShieldCheck className="size-6 text-[#236b5a]" /></div><div className="grid gap-4 p-5 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:p-6"><span className="grid size-12 place-items-center rounded-2xl bg-[#fff2ce] font-extrabold text-[#a7710e]">03</span><div><h3 className="font-extrabold text-[#172319]">跳去企业当下的招聘页</h3><p className="mt-1 text-sm text-[#6c7169]">投递前始终以企业页面实时信息为准。</p></div><Compass className="size-6 text-[#a7710e]" /></div></div></div></div>
        </section>

        <section className="border-y border-[#ded8cd] bg-[#edf3e4] py-14"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-[#236b5a]">START EXPLORING</p><h2 className="display-title mt-3 text-4xl text-[#172319]">先从这些企业开始逛。</h2></div><Link href="/companies" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-[#1d402f] px-4 text-sm font-extrabold text-[#1d402f] transition hover:bg-[#1d402f] hover:text-white sm:self-auto">浏览 {companies.length} 家企业 <ArrowRight className="size-4" /></Link></div><div className="mt-8 max-w-6xl space-y-4">{featuredCompanies.map((company, index) => <CompanyCard company={company} index={index} key={company.id} />)}<Link href="/companies" className="group flex min-h-16 items-center justify-between rounded-[22px] border-2 border-[#1d402f] bg-[#fffdfa] px-5 py-3 text-[#1d402f] shadow-[0_6px_0_#1d402f] transition hover:-translate-y-0.5 hover:shadow-[0_8px_0_#1d402f] active:translate-y-[3px] active:shadow-[0_3px_0_#1d402f]"><span><span className="playful-label block text-[#72806f]">MORE DOORS TO KNOCK</span><span className="company-entry-title mt-1 block text-xl">再逛逛全部 {companies.length} 家企业</span></span><span className="grid size-10 place-items-center rounded-xl bg-[#ee6145] text-white transition-transform group-hover:translate-x-1"><ArrowRight className="size-5" /></span></Link></div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="rounded-[32px] bg-[#172319] p-7 text-white sm:p-10"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="eyebrow text-[#f6c95b]">THE SMALL PRINT</p><h2 className="display-title mt-3 text-4xl">小招不替企业发招聘，<br />只帮你少走一点弯路。</h2><p className="mt-5 max-w-2xl leading-7 text-[#c6d5c7]">目前已收录 {jobs.length} 条职位样本和 {catalogMeta.officialActiveCompanyCount} 个官方有效入口。数据会逐步补充；如果一个信息仍待核验，我们会直接告诉你。</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-extrabold text-[#f6c95b]">{catalogMeta.directJobCount}</p><p className="mt-1 text-sm text-[#c6d5c7]">可直达职位详情</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-extrabold text-[#f6c95b]">{catalogMeta.verifiedAt}</p><p className="mt-1 text-sm text-[#c6d5c7]">最近一次核验</p></div></div></div></div></section>
      </main>
    </>
  );
}




