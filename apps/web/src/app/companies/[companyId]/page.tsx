import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, CircleAlert, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { ReportIssueButton } from "@/components/report-issue-button";
import { ShareButton } from "@/components/share-button";
import { SaveButton } from "@/components/save-button";
import { SiteHeader } from "@/components/site-header";
import { ViewTracker } from "@/components/view-tracker";
import { companies, getCompany, getCompanyJobs } from "@/data/catalog";

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "已收录招聘来源";
  }
}

export function generateStaticParams() {
  return companies.map((company) => ({ companyId: company.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ companyId: string }> }): Promise<Metadata> {
  const { companyId } = await params;
  const company = getCompany(companyId);
  return company
    ? { title: `${company.name}招聘入口｜蓉小招`, description: `查看${company.name}在成都的招聘入口、来源类型、验证状态与职位样本。` }
    : { title: "企业未找到｜蓉小招" };
}

export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = getCompany(companyId);
  if (!company) notFound();

  const companyJobs = getCompanyJobs(company.id);
  const isThirdPartyLead = company.sourceTier === "third_party_lead";
  const isManualReview = company.status === "needs_manual_review" || company.recordCategory === "manual_review";
  const sourceLabel = isManualReview ? "官方招聘入口 · 当前状态待确认" : company.isOfficial ? "官方招聘入口" : isThirdPartyLead ? "第三方招聘线索" : "来源待核验";
  const actionLabel = isManualReview ? "前往企业官网招聘页" : company.isOfficial ? "去官方招聘页" : isThirdPartyLead ? "查看第三方线索" : "查看已收录来源";

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><ViewTracker itemId={`company:${company.id}`} />
        <Link href="/companies" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]">
          <ArrowLeft className="size-4" />回到企业地图
        </Link>

        <article className="mt-4 overflow-hidden rounded-[32px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_13px_35px_rgba(46,51,38,.08)]">
          <div className="relative overflow-hidden bg-[#1d402f] px-6 py-8 text-white sm:px-9 sm:py-10">
            <div className="absolute -right-9 -top-14 size-52 rounded-full border-[26px] border-[#7ab69b]/25" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-extrabold text-[#ecf8e8]">{company.grade}级企业</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${company.isOfficial ? "bg-[#dceee8] text-[#236b5a]" : "bg-[#fff0df] text-[#9b531f]"}`}>
                    {company.isOfficial ? <ShieldCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}{sourceLabel}
                  </span>
                </div>
                <h1 className="display-title mt-5 text-4xl leading-tight sm:text-5xl">{company.name}</h1>
                <p className="mt-3 text-[#cbe0cf]">{company.industry || "行业待补充"} · 成都</p>
              </div>
              <div className="flex flex-wrap gap-2"><ShareButton title={company.name} text={`${company.name} · 成都招聘入口`} /><SaveButton itemId={`company:${company.id}`} label={company.name} /></div>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="eyebrow text-[#ee6145]">CAREER ENTRY</p>
                <h2 className="company-entry-title mt-2 text-2xl text-[#172319]">先确认来源，再决定要不要投。</h2>
                <p className="mt-2 max-w-2xl leading-7 text-[#657064]">小招不替企业发布招聘。这里会把入口来源、最近核验时间和已发现的职位样本摊开，让你带着判断去企业页面继续找。</p>
              </div>
              {company.careerUrl ? <div className="shrink-0 md:text-right">
                <a href={company.careerUrl} target="_blank" rel="noreferrer" className="button-type inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ee6145] px-5 text-sm font-extrabold text-white shadow-[0_5px_0_#ba422d] transition hover:-translate-y-0.5 hover:bg-[#d94f35] hover:shadow-[0_7px_0_#ba422d] active:translate-y-[3px] active:shadow-[0_2px_0_#ba422d]">
                  <ExternalLink className="size-4" />{actionLabel}
                </a>
                <p className="mt-2 text-xs text-[#748075]">将打开 {sourceHost(company.careerUrl)} · 核验于 {company.verifiedAt || "待补充"}</p>
              </div> : <span className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-[#ded8cd] bg-[#f4f0e9] px-5 text-sm font-bold text-[#657064]">暂无可跳转招聘入口</span>}
            </div>

            {companyJobs.length > 0 && <a href="#job-samples" className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#e7f0d6] px-4 text-sm font-extrabold text-[#1d402f] transition hover:bg-[#dceee8]">先看已收录的 {companyJobs.length} 条职位样本 ↓</a>}
            {!company.isOfficial && <p className="mt-6 flex items-start gap-2 rounded-2xl border border-[#f2d7b7] bg-[#fff4e7] p-4 text-sm leading-6 text-[#805021]"><CircleAlert className="mt-0.5 size-4 shrink-0" />{isThirdPartyLead ? "这是一条第三方招聘线索，不代表企业官方发布；投递前请自行核验企业官网或官方账号。" : "该企业的招聘来源仍待核验；当前页面不会将其包装为“官方直招”。"}</p>}

            <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[#e2dbd0] bg-[#e2dbd0] sm:grid-cols-2">
              <div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">成都办公地点</p><p className="mt-2 flex gap-2 text-sm font-bold text-[#334235]"><MapPin className="size-4 shrink-0 text-[#ee6145]" />{company.officeAddress || "待补充"}</p></div>
              <div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">招聘来源</p><p className="mt-2 flex gap-2 text-sm font-bold text-[#334235]"><Building2 className="size-4 shrink-0 text-[#236b5a]" />{company.careerSourceName || "待补充"} · {company.sourceType}</p></div>
              <div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">最近核验</p><p className="mt-2 flex gap-2 text-sm font-bold text-[#334235]"><CalendarDays className="size-4 shrink-0 text-[#ee6145]" />{company.verifiedAt || "待补充"}</p></div>
              <div className="bg-[#fffdfa] p-4"><p className="text-xs font-bold text-[#8a8d85]">入口状态</p><p className="mt-2 text-sm font-bold text-[#334235]">{company.statusLabel}</p></div>
            </div>
            {company.notes && <div className="mt-6 rounded-2xl bg-[#edf3e4] p-4 text-sm leading-6 text-[#48594c]"><p className="font-extrabold text-[#236b5a]">收录说明</p><p className="mt-1">{company.notes}</p></div>}<div className="mt-5"><ReportIssueButton kind="企业" itemId={company.id} title={company.name} sourceUrl={company.careerUrl} verifiedAt={company.verifiedAt} /></div>
          </div>
        </article>

        <section id="job-samples" className="mt-10 scroll-mt-24">
          <div className="flex items-end justify-between gap-4"><div><p className="eyebrow text-[#ee6145]">JOB SAMPLES</p><h2 className="company-entry-title mt-1 text-3xl text-[#172319]">这个公司已收录 {companyJobs.length} 条职位样本</h2></div>{companyJobs.length > 0 && <Link href={`/jobs?q=${encodeURIComponent(company.name)}`} className="hidden min-h-10 items-center rounded-full bg-[#e7f0d6] px-4 text-sm font-extrabold text-[#236b5a] sm:inline-flex">在职位里继续看</Link>}</div>
          <div className="mt-5 grid gap-3">
            {companyJobs.map((job) => <article key={job.key} className="flex flex-col justify-between gap-4 rounded-[22px] border border-[#ded8cd] bg-[#fffdfa] p-5 sm:flex-row sm:items-center"><div><div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${job.isDirectDetail ? "bg-[#fff0c9] text-[#8b5b09]" : "bg-[#dceee8] text-[#236b5a]"}`}>{job.isDirectDetail ? "直达职位详情" : "官方职位列表"}</span></div><h3 className="company-entry-title mt-2 text-xl text-[#172319]"><Link className="hover:text-[#ee6145]" href={`/jobs/${encodeURIComponent(job.key)}`}>{job.title}</Link></h3><p className="mt-1 text-sm text-[#657064]">{job.location || "成都"} · {job.function || "职能待补充"} · {job.recruitmentType || "招聘类型待补充"}</p></div><Link href={`/jobs/${encodeURIComponent(job.key)}`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#ded8cd] px-4 text-sm font-extrabold text-[#236b5a] hover:border-[#236b5a]">查看线索</Link></article>)}
            {companyJobs.length === 0 && <div className="rounded-[24px] border border-dashed border-[#c9c1b4] bg-[#fffdfa] p-7 text-sm leading-6 text-[#657064]">该企业的招聘入口已收录，但当前还没有可展示的职位样本{company.chengduRoleStatus === "未知" ? "，成都岗位是否仍在招聘待确认" : ""}。你可以直接前往已收录来源查看实时信息。</div>}
          </div>
        </section>
      </main>
    </>
  );
}

