import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert, Database, ExternalLink, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { catalogMeta } from "@/data/catalog";

export const metadata: Metadata = { title: "数据说明｜蓉小招", description: "蓉小招的数据来源、核验规则和使用提示。" };

export default function DataPolicyPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"><ArrowLeft className="size-4" />回到首页</Link>
    <div className="mt-4"><p className="eyebrow text-[#236b5a]">DATA NOTES</p><h1 className="display-title mt-3 text-5xl leading-none text-[#172319]">这份目录，应该怎样看？</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#526052]">蓉小招是招聘入口索引，不是企业招聘方。下面把数据从哪里来、我们如何判断，以及你需要自己确认什么说清楚。</p></div>
    <div className="mt-8 grid gap-4 md:grid-cols-2"><article className="rounded-[26px] border border-[#ded8cd] bg-[#fffdfa] p-6"><Database className="size-6 text-[#236b5a]" /><h2 className="mt-4 text-xl font-extrabold text-[#172319]">数据从哪里来</h2><p className="mt-2 text-sm leading-7 text-[#657064]">主要来自企业官网招聘页、企业专属 ATS、集团招聘入口、企业官方公开公告以及可追溯的高校就业网公告。第三方线索会被单独标注。</p></article><article className="rounded-[26px] border border-[#ded8cd] bg-[#fffdfa] p-6"><RefreshCw className="size-6 text-[#ee6145]" /><h2 className="mt-4 text-xl font-extrabold text-[#172319]">状态会变化</h2><p className="mt-2 text-sm leading-7 text-[#657064]">招聘页面可能随时新增、关闭或更换入口。页面上的“最近核验”只是我们最后一次检查时间，不代表企业承诺岗位仍然有效。</p></article></div>
    <section className="mt-4 rounded-[26px] border border-[#efc49f] bg-[#fff4e7] p-6"><div className="flex gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-[#c05c2f]" /><div><h2 className="font-extrabold text-[#805021]">投递前请完成最后确认</h2><p className="mt-2 text-sm leading-7 text-[#805021]">请以企业官网或官方招聘系统当前显示的岗位名称、工作地点、任职要求、截止时间和投递方式为准。不要仅凭蓉小招的收录结果发送简历，也不要向无法确认归属的账号提供身份证、银行卡等敏感信息。</p></div></div></section>
    <section className="mt-8 rounded-[26px] border border-[#ded8cd] bg-[#fffdfa] p-6"><h2 className="text-xl font-extrabold text-[#172319]">当前目录概况</h2><dl className="mt-5 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs font-bold text-[#8a8d85]">收录企业</dt><dd className="mt-1 text-2xl font-extrabold text-[#236b5a]">{catalogMeta.companyCount}</dd></div><div><dt className="text-xs font-bold text-[#8a8d85]">职位样本</dt><dd className="mt-1 text-2xl font-extrabold text-[#236b5a]">{catalogMeta.jobSampleCount}</dd></div><div><dt className="text-xs font-bold text-[#8a8d85]">最近核验</dt><dd className="mt-1 text-2xl font-extrabold text-[#236b5a]">{catalogMeta.verifiedAt}</dd></div></dl><Link href="/companies" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#236b5a] hover:text-[#ee6145]">浏览企业目录 <ExternalLink className="size-4" /></Link></section>
  </main></>;
}
