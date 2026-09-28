import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Database, FileSearch, ShieldCheck } from "lucide-react";
import { catalogMeta, companies, jobs } from "@/data/catalog";
import { getCompanyReviewQueue } from "@/lib/company-review";
import { getSourceReviewQueue } from "@/lib/source-review";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "运营总览｜蓉小招运营工具",
  description: "蓉小招本地运营工具总览，仅供维护数据和复核来源使用。",
  robots: { index: false, follow: false },
};

export default async function OpsOverviewPage() {
  const companyQueue = await getCompanyReviewQueue();
  const sourceQueue = await getSourceReviewQueue();
  const directJobs = jobs.filter((job) => job.isDirectDetail).length;
  const officialCompanies = companies.filter((company) => company.isOfficial).length;

  return <main className="min-h-screen bg-[#f5f1e9] px-4 py-8 text-[#172319] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow text-[#236b5a]">RONG XIAO ZHAO / OPS</p><h1 className="display-title mt-2 text-4xl sm:text-5xl">运营总览</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#657064]">这里不直接发布数据，只帮助维护者查看当前版本、安排复核和审核来源变化。</p></div>
        <Link href="/" className="inline-flex min-h-10 items-center rounded-full border border-[#c9c1b4] bg-[#fffdfa] px-4 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]">回到前台</Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="数据概览">
        {[["数据版本", catalogMeta.version, "最近核验 " + catalogMeta.verifiedAt], ["企业目录", `${catalogMeta.companyCount} 家`, `${officialCompanies} 家官方来源`], ["职位样本", `${catalogMeta.jobSampleCount} 条`, `${directJobs} 条可直达详情`], ["城市范围", catalogMeta.city, "当前只维护成都"]].map(([label, value, detail]) => <div key={label} className="rounded-[24px] border border-[#ded8cd] bg-[#fffdfa] p-5 shadow-[0_8px_24px_rgba(46,51,38,.05)]"><p className="text-xs font-extrabold text-[#788174]">{label}</p><p className="mt-2 text-2xl font-black text-[#172319]">{value}</p><p className="mt-1 text-xs text-[#657064]">{detail}</p></div>)}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="运营工具">
        <Link href="/ops/review-queue" className="group rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] p-6 transition hover:-translate-y-0.5 hover:border-[#aec7b5] hover:shadow-[0_12px_28px_rgba(46,51,38,.08)]"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#e7f0d6] text-[#236b5a]"><ClipboardCheck className="size-5" /></span><ArrowRight className="size-5 text-[#9aa297] transition group-hover:translate-x-1" /></div><h2 className="mt-5 text-xl font-black">企业复核排期</h2><p className="mt-2 text-sm leading-6 text-[#657064]">查看哪些企业需要重新核验招聘入口、状态或来源。</p><p className="mt-4 text-sm font-extrabold text-[#236b5a]">高优先级 {companyQueue.summary.highPriority} · 近期到期 {companyQueue.summary.dueSoon}</p></Link>
        <Link href="/ops/review" className="group rounded-[28px] border border-[#ded8cd] bg-[#fffdfa] p-6 transition hover:-translate-y-0.5 hover:border-[#aec7b5] hover:shadow-[0_12px_28px_rgba(46,51,38,.08)]"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#fff0df] text-[#c94a34]"><FileSearch className="size-5" /></span><ArrowRight className="size-5 text-[#9aa297] transition group-hover:translate-x-1" /></div><h2 className="mt-5 text-xl font-black">来源审核台</h2><p className="mt-2 text-sm leading-6 text-[#657064]">审核官方来源扫描产生的新增、变化和异常候选。</p><p className="mt-4 text-sm font-extrabold text-[#c94a34]">待审核 {sourceQueue.summary.total} 条</p></Link>
        <div className="rounded-[28px] border border-[#ded8cd] bg-[#edf3e4] p-6"><div className="grid size-11 place-items-center rounded-2xl bg-white/80 text-[#236b5a]"><Database className="size-5" /></div><h2 className="mt-5 text-xl font-black">发布检查</h2><p className="mt-2 text-sm leading-6 text-[#526052]">V1.4 已通过数据检查、健康检查、Lint 和生产构建。</p><div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold text-[#236b5a]"><ShieldCheck className="size-3.5" />当前版本可发布</div></div>
      </section>

      <p className="mt-8 text-xs leading-5 text-[#8a8d85]">运营页面不会自动关闭职位，也不会把扫描结果直接写入前台。正式部署前请设置 OPS_USER 和 OPS_PASSWORD。</p>
    </div>
  </main>;
}
