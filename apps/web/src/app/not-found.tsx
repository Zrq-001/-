import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="site-grid grid min-h-[70vh] place-items-center px-4 py-16">
      <section className="paper-card w-full max-w-lg rounded-[28px] p-8 text-center sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#fff0df] text-[#ee6145]"><SearchX className="size-8" /></div>
        <p className="eyebrow mt-6 text-[#ee6145]">404 / NOT FOUND</p>
        <h1 className="display-title mt-3 text-3xl text-[#172319] sm:text-4xl">这条线索暂时找不到</h1>
        <p className="mt-3 text-sm leading-7 text-[#6c7169]">可能是职位链接已更新，或企业信息正在重新整理。可以回到首页重新搜索。</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1d402f] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#123227] transition hover:-translate-y-0.5 hover:bg-[#236b5a]"><ArrowLeft className="size-4" />回到首页</Link>
      </section>
    </main>
  );
}
