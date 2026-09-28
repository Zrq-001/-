export default function Loading() {
  return (
    <main className="site-grid min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[#dceee8]" />
        <div className="mt-4 h-12 max-w-xl animate-pulse rounded-2xl bg-[#e7f0d6]" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[24px] border border-[#dfd9cd] bg-[#fffdfa]" />)}
        </div>
        <p className="mt-6 text-sm font-bold text-[#6c7169]">正在整理成都招聘线索…</p>
      </div>
    </main>
  );
}
