import { CircleDot } from "lucide-react";
import { JobDirectory } from "@/components/job-directory";
import { SiteHeader } from "@/components/site-header";
import { catalogMeta, jobs } from "@/data/catalog";

type JobSearchParams = { q?: string | string[]; function?: string | string[]; type?: string | string[]; direct?: string | string[]; official?: string | string[]; sort?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function JobsPage({ searchParams }: { searchParams: Promise<JobSearchParams> }) {
  const params = await searchParams;
  const initialFilters = { q: first(params.q), function: first(params.function), type: first(params.type), direct: first(params.direct), official: first(params.official), sort: first(params.sort) };
  return <><SiteHeader /><main id="main-content"><section className="site-grid border-b border-[#ded8cd] bg-[#edf3e4]"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-16"><div><p className="eyebrow text-[#236b5a]">JOB FINDER / CHENGDU</p><h1 className="display-title mt-3 text-5xl leading-none text-[#172319] sm:text-6xl">查岗位，不用先盲投。</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#526052]">搜职位、公司或行业，优先看有可追溯来源的成都招聘线索。点进去前，你会知道它是官网入口、职位详情，还是仍需核验的线索。</p></div><div className="flex gap-2 rounded-[24px] border border-[#cbd8c1] bg-[#fbfcf8] p-4 text-sm"><CircleDot className="mt-0.5 size-5 shrink-0 text-[#ee6145]" /><p className="max-w-52 leading-6 text-[#526052]"><strong className="text-[#172319]">{catalogMeta.jobSampleCount} 条职位样本</strong><br />最近核验：{catalogMeta.verifiedAt}</p></div></div></section><div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"><JobDirectory initialJobs={jobs} initialFilters={initialFilters} /></div></main></>;
}


