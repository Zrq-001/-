"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="site-grid grid min-h-[60vh] place-items-center px-4 py-16">
      <section className="paper-card w-full max-w-lg rounded-[28px] p-8 text-center sm:p-10" role="alert">
        <p className="eyebrow text-[#ee6145]">SORRY, TRY AGAIN</p>
        <h1 className="display-title mt-3 text-3xl text-[#172319] sm:text-4xl">这页暂时卡住了</h1>
        <p className="mt-3 text-sm leading-7 text-[#6c7169]">可能是网络或本地服务刚刚重启。你的收藏不会因此丢失。</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="min-h-11 rounded-full bg-[#1d402f] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#123227] transition hover:-translate-y-0.5 hover:bg-[#236b5a]">再试一次</button>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-[#1d402f] px-5 text-sm font-extrabold text-[#1d402f]">回到首页</Link>
        </div>
      </section>
    </main>
  );
}
