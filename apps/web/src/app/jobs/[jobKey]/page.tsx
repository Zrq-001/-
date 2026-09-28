import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { ReportIssueButton } from "@/components/report-issue-button";
import { ShareButton } from "@/components/share-button";
import { SaveButton } from "@/components/save-button";
import { SiteHeader } from "@/components/site-header";
import { ViewTracker } from "@/components/view-tracker";
import { getCompany, getJob } from "@/data/catalog";

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "企业招聘入口";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ jobKey: string }> }): Promise<Metadata> {
  const { jobKey } = await params;
  const job = getJob(decodeURIComponent(jobKey));
  return job ? { title: `${job.title}｜${job.companyName}｜蓉小招`, description: `查看${job.companyName}的${job.title}职位线索、来源链接与最近验证时间。` } : { title: "职位未找到｜蓉小招" };
}

export default async function JobPage({ params }: { params: Promise<{ jobKey: string }> }) {
  const { jobKey } = await params;
  const job = getJob(decodeURIComponent(jobKey));
  if (!job) notFound();

  const company = getCompany(job.companyId);
  const actionUrl = job.isDirectDetail ? job.applyUrl : job.sourceUrl;
  const actionLabel = job.isDirectDetail ? "前往官方职位页" : job.isOfficial ? "去企业招聘页" : "查看已收录来源";

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><ViewTracker itemId={`job:${job.key}`} />
        <Link href="/jobs" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"><ArrowLeft className="size-4" />回到岗位查询</Link>
        <article className="mt-4 overflow-hidden rounded-[32px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_13px_35px_rgba(46,51,38,.08)]">
          <div className="bg-[#fff0df] px-6 py-8 sm:px-9 sm:py-10"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${job.isDirectDetail ? "bg-[#fff0c9] text-[#8b5b09]" : "bg-[#dceee8] text-[#236b5a]"}`}>{job.isDirectDetail ? "可直达职位详情" : "企业官方招聘列表"}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-[#236b5a]"><ShieldCheck className="size-3.5" />{job.isOfficial ? "官方来源" : "来源待核验"}</span></div><div className="flex flex-wrap gap-2"><ShareButton title={job.title} text={`${job.companyName} · ${job.title}`} /><SaveButton itemId={`job:${job.key}`} label={job.title} /></div></div><h1 className="display-title mt-6 text-4xl leading-tight text-[#172319] sm:text-5xl">{job.title}</h1>{company ? <Link href={`/companies/${company.id}`} className="mt-4 inline-flex items-center gap-2 text-base font-extrabold text-[#236b5a] hover:text-[#ee6145]"><Building2 className="size-4" />{company.name}</Link> : <p className="mt-4 font-bold text-[#526052]">{job.companyName}</p>}</div>
          <div className="px-6 py-7 sm:px-9"><div className="grid gap-px overflow-hidden rounded-2xl border border-[#e2dbd0] bg-[#e2dbd0] sm:grid-cols-3"><div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">工作地点</p><p className="mt-2 flex gap-2 text-sm font-bold text-[#334235]"><MapPin className="size-4 shrink-0 text-[#ee6145]" />{job.location || "成都"}</p></div><div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">职能类别</p><p className="mt-2 text-sm font-bold text-[#334235]">{job.function || "待补充"}</p></div><div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">招聘类型</p><p className="mt-2 text-sm font-bold text-[#334235]">{job.recruitmentType || "待补充"}</p></div></div>
            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-lg text-sm leading-6 text-[#657064]">这是一个职位线索索引。投递前请以企业页面当下展示的岗位职责、要求和招聘状态为准。</p><div className="sm:text-right"><a href={actionUrl} target="_blank" rel="noreferrer" className="button-type inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#ee6145] px-5 text-sm font-extrabold text-white shadow-[0_5px_0_#ba422d] transition hover:-translate-y-0.5 hover:bg-[#d94f35] hover:shadow-[0_7px_0_#ba422d] active:translate-y-[3px] active:shadow-[0_2px_0_#ba422d]"><ExternalLink className="size-4" />{actionLabel}</a><p className="mt-2 text-xs text-[#748075]">将打开 {sourceHost(actionUrl)} · 核验于 {job.verifiedAt || "待补充"}</p></div></div>
            <section className="mt-8 rounded-[22px] bg-[#edf3e4] p-5"><p className="eyebrow text-[#236b5a]">SOURCE & CHECK</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-[1.2fr_.6fr_.8fr]"><div><dt className="font-bold text-[#6c7169]">来源入口</dt><dd className="mt-1 break-all font-medium text-[#334235]">{job.sourceUrl}</dd></div><div><dt className="font-bold text-[#6c7169]">最近核验</dt><dd className="mt-1 inline-flex items-center gap-1 font-bold text-[#334235]"><CalendarDays className="size-4 text-[#ee6145]" />{job.verifiedAt || "待补充"}</dd></div><div><dt className="font-bold text-[#6c7169]">链接类型</dt><dd className="mt-1 font-bold text-[#334235]">{job.isDirectDetail ? "独立职位详情页" : "企业招聘列表页"}</dd></div></dl></section><div className="mt-4"><ReportIssueButton kind="职位" itemId={job.key} title={job.title} sourceUrl={job.sourceUrl} verifiedAt={job.verifiedAt} /></div>
          </div>
        </article>
      </main>
    </>
  );
}

