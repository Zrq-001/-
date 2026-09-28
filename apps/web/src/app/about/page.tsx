import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, Search, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "关于蓉小招｜蓉小招", description: "了解蓉小招如何整理成都企业招聘入口，以及它不做什么。" };

export default function AboutPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"><ArrowLeft className="size-4" />回到首页</Link>
    <section className="mt-4 overflow-hidden rounded-[32px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_13px_35px_rgba(46,51,38,.08)]">
      <div className="bg-[#1d402f] px-6 py-9 text-white sm:px-10 sm:py-12"><p className="eyebrow text-[#bcd9c3]">ABOUT RONG XIAO ZHAO</p><h1 className="display-title mt-4 text-4xl leading-tight sm:text-6xl">帮你少搜几百个网页，<br /><span className="text-[#f6c95b]">先找到该去哪里投。</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#d4e7d6]">蓉小招是一个成都优先的招聘入口查询工具，把散落在企业官网、官方 ATS、集团招聘页和公开招聘公告里的线索，整理成可查、可点、可核验的目录。</p></div>
      <div className="grid gap-px bg-[#e2dbd0] sm:grid-cols-3"><div className="bg-[#fffdfa] p-6"><Search className="size-6 text-[#ee6145]" /><h2 className="mt-4 font-extrabold text-[#172319]">先查方向</h2><p className="mt-2 text-sm leading-6 text-[#657064]">按职位、企业、行业或成都区域找到你关心的线索。</p></div><div className="bg-[#fffdfa] p-6"><ShieldCheck className="size-6 text-[#236b5a]" /><h2 className="mt-4 font-extrabold text-[#172319]">再看来源</h2><p className="mt-2 text-sm leading-6 text-[#657064]">每条记录尽量标注来源类型、最近核验日期和当前状态。</p></div><div className="bg-[#fffdfa] p-6"><Compass className="size-6 text-[#a7710e]" /><h2 className="mt-4 font-extrabold text-[#172319]">回到原页面</h2><p className="mt-2 text-sm leading-6 text-[#657064]">蓉小招不代替企业招聘，最终信息以企业原始页面为准。</p></div></div>
      <div className="px-6 py-8 sm:px-10"><h2 className="company-entry-title text-3xl text-[#172319]">我们会明确告诉你“不确定”。</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#657064]">如果招聘入口存在但页面没有日期、职位列表或可验证的投递状态，我们会标记为“需人工复核”，而不是把它包装成“正在招聘”。如果只有第三方线索，也会单独标注，不冒充官方直招。</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/jobs" className="inline-flex min-h-11 items-center rounded-full bg-[#ee6145] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#ba422d] hover:bg-[#d94f35]">开始查询</Link><Link href="/data-policy" className="inline-flex min-h-11 items-center rounded-full border border-[#c9c1b4] px-5 text-sm font-extrabold text-[#236b5a] hover:bg-[#edf3e4]">查看数据说明</Link></div></div>
    </section>
  </main></>;
}
