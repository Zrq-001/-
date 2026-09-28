import { Heart, Sparkles } from "lucide-react";
import { NotebookBoard } from "@/components/notebook-board";
import { NotebookTransfer } from "@/components/notebook-transfer";
import { SiteHeader } from "@/components/site-header";
import { companies, jobs } from "@/data/catalog";
import type { NotebookEntry } from "@/lib/notebook";

export const metadata = { title: "我的小本本｜蓉小招", description: "保存心仪的成都企业和岗位，记录投递计划与浏览历史。" };

export default function NotebookPage() {
  const entries: NotebookEntry[] = [
    ...companies.map((company) => ({ itemId: `company:${company.id}`, kind: "company" as const, title: company.name, subtitle: `${company.industry || "行业待补充"} · ${company.officeAddress || "成都"}`, detail: `${company.isOfficial ? "官方入口" : company.sourceTier === "third_party_lead" ? "第三方线索" : "待核验"} · ${company.statusLabel}`, href: `/companies/${company.id}`, isOfficial: company.isOfficial })),
    ...jobs.map((job) => ({ itemId: `job:${job.key}`, kind: "job" as const, title: job.title, subtitle: job.companyName, detail: `${job.location || "成都"} · ${job.function || "职能待补充"} · ${job.recruitmentType || "招聘类型待补充"}`, href: `/jobs/${encodeURIComponent(job.key)}`, isOfficial: job.isOfficial })),
  ];

  return <><SiteHeader /><main id="main-content"><section className="site-grid border-b border-[#ded8cd] bg-[#fff0df]"><div className="mx-auto grid max-w-7xl gap-7 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-16"><div><p className="eyebrow text-[#c94a34]">MY JOB NOTEBOOK</p><h1 className="display-title mt-3 text-5xl leading-none text-[#172319] sm:text-6xl">把想去的地方，<br />先放进小本本。</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#526052]">收藏企业和岗位，写下自己的投递计划。内容只保存在你当前使用的这台设备上，不会被上传。</p></div><div className="rounded-[24px] border border-[#f0caa7] bg-[#fffaf4] p-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#ee6145] text-white"><Heart className="size-5 fill-current" /></span><p className="max-w-56 text-sm leading-6 text-[#526052]"><strong className="text-[#172319]">给自己留条线索</strong><br />“准备投”“已投递”和备注，都在这里整理。</p></div></div></div></section><div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex items-center gap-2 rounded-full bg-[#e7f0d6] px-3 py-2 text-sm font-bold text-[#236b5a]"><Sparkles className="size-4" />本地保存，不需要注册账号</div><NotebookTransfer /></div><NotebookBoard entries={entries} /></div></main></>;
}


