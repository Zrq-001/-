import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, CircleAlert, MapPin, ShieldCheck } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import type { Company } from "@/data/catalog";

const statusStyles: Record<string, string> = {
  active: "border-[#a7cfaa] bg-[#e5f2e4] text-[#285b35]",
  accessible_no_job: "border-[#f1cf7f] bg-[#fff0c9] text-[#8b5b09]",
  temporarily_unavailable: "border-[#d7d2c9] bg-[#ece9e3] text-[#6c7169]",
  needs_manual_review: "border-[#efc49f] bg-[#fff0df] text-[#9b531f]",
  not_found: "border-[#d7d2c9] bg-[#ece9e3] text-[#6c7169]",
};

const entryTone = (company: Company) => {
  if (company.isOfficial) return {
    edge: "border-[#c7d9bf]",
    number: "bg-[#e7f0d6] text-[#236b5a]",
    badge: "border-[#add1c1] bg-[#dceee8] text-[#236b5a]",
    button: "bg-[#236b5a] shadow-[0_5px_0_#164b3e] hover:bg-[#1d5b4d] hover:shadow-[0_3px_0_#164b3e]",
    bottom: "bg-[#f1f7e9]",
  };

  return {
    edge: "border-[#e5d3b3]",
    number: "bg-[#fff0df] text-[#9b531f]",
    badge: "border-[#edc79f] bg-[#fff0df] text-[#9b531f]",
    button: "bg-[#ee6145] shadow-[0_5px_0_#ba422d] hover:bg-[#d94f35] hover:shadow-[0_3px_0_#ba422d]",
    bottom: "bg-[#fff8ed]",
  };
};

export function CompanyCard({ company, index }: { company: Company; index?: number }) {
  const isManualReview = company.status === "needs_manual_review" || company.recordCategory === "manual_review";
  const sourceLabel = isManualReview ? "官方入口 · 待确认" : company.isOfficial ? "官方入口" : company.sourceTier === "third_party_lead" ? "第三方线索" : "待核验";
  const tone = entryTone(company);
  const entryNumber = String((index ?? 0) + 1).padStart(2, "0");

  return (
    <article className={`company-entry group relative overflow-hidden rounded-[26px] border-2 ${tone.edge} bg-[#fffdfa] shadow-[0_7px_0_#d7d1c5] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_0_#d7d1c5]`}>
      <div className="pointer-events-none absolute -right-9 -top-10 size-[9.5rem] rounded-full border-[18px] border-[#f4efe5] opacity-80" />
      <div className="relative grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(210px,.82fr)_auto] sm:items-center sm:gap-5 sm:p-5">
        <div className={`grid size-13 shrink-0 place-items-center rounded-[18px] text-lg font-black shadow-[0_3px_0_rgba(23,35,25,.14)] ${tone.number}`} aria-hidden="true">
          {entryNumber}
        </div>

        <div className="min-w-0">
          <p className="playful-label truncate text-[#72806f]">{company.industry || "行业待补充"}</p>
          <h3 className="company-entry-title mt-1.5 max-w-2xl text-[1.35rem] leading-[1.15] text-[#172319] sm:text-[1.55rem]">
            <Link href={`/companies/${company.id}`} className="rounded-md outline-none transition-colors hover:text-[#ee6145] focus-visible:ring-3 focus-visible:ring-[#ee6145]/30">
              {company.name}
            </Link>
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#eff1e9] px-2.5 py-1 text-xs font-extrabold text-[#4b5a4d]">{company.grade}级企业</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold ${tone.badge}`}>
              {company.isOfficial ? <ShieldCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
              {sourceLabel}
            </span>
          </div>
        </div>

        <div className="grid min-w-0 gap-2.5 border-y border-dashed border-[#ded8cd] py-3 text-sm text-[#5f6b60] sm:border-y-0 sm:border-l sm:py-0 sm:pl-5">
          <p className="flex min-w-0 items-center gap-2"><MapPin className="size-4 shrink-0 text-[#ee6145]" /><span className="truncate">{company.officeAddress || "成都办公地点待补充"}</span></p>
          <p className="flex min-w-0 items-center gap-2"><Building2 className="size-4 shrink-0 text-[#236b5a]" /><span className="truncate">{company.careerSourceName || "招聘入口待补充"}</span></p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <SaveButton itemId={`company:${company.id}`} label={company.name} compact />
          <Link href={`/companies/${company.id}`} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-white transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ee6145]/30 active:translate-y-[3px] active:shadow-none ${tone.button}`}>
            看入口 <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className={`relative flex flex-col gap-2 border-t border-dashed border-[#d9d1c5] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5 ${tone.bottom}`}>
        <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-extrabold ${statusStyles[company.status] ?? statusStyles.not_found}`}>{company.statusLabel}</span>
        <p className="flex items-center gap-1.5 text-[#6d786e]"><CalendarDays className="size-3.5" />核验于 {company.verifiedAt || "待补充"} · {company.chengduRoleStatus === "未知" ? "成都岗位待确认" : company.jobSampleCount > 0 ? `${company.jobSampleCount} 条职位样本` : "暂无职位样本"}</p>
      </div>
    </article>
  );
}

