"use client";

import Link from "next/link";
import { Heart, Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { NOTEBOOK_CHANGE_EVENT, SAVED_ITEMS_KEY } from "@/lib/notebook";

const links = [
  { href: "/jobs", label: "查岗位" },
  { href: "/companies", label: "找企业" },
  { href: "/notebook", label: "小本本" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(SAVED_ITEMS_KEY) ?? "[]");
        setSavedCount(Array.isArray(saved) ? saved.length : 0);
      } catch {
        setSavedCount(0);
      }
    };
    updateCount();
    window.addEventListener(NOTEBOOK_CHANGE_EVENT, updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener(NOTEBOOK_CHANGE_EVENT, updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  return (
    <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#172319] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white">跳到主要内容</a>
    <header className="sticky top-0 z-40 border-b border-[#dfd9cd]/80 bg-[#f8f5ef]/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="蓉小招首页">
          <span className="grid size-10 place-items-center rounded-[15px] bg-[#1d402f] transition-transform duration-200 group-hover:-rotate-6"><BrandMark className="size-7" /></span>
          <span><b className="brand-type block text-[18px] leading-5 text-[#172319]">蓉小招</b><span className="block text-[10px] font-bold tracking-[.14em] text-[#7c806e]">CHENGDU JOB MAP</span></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主要导航">
          {links.map((link) => <Link key={link.href} href={link.href} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${isActive(link.href) ? "bg-[#1d402f] text-white" : "text-[#526052] hover:bg-[#e7f0d6]"}`}>{link.label}</Link>)}
          <Link href="/notebook" aria-label={`打开我的小本本${savedCount ? `，已收藏 ${savedCount} 项` : ""}`} className={`relative ml-1 grid size-10 place-items-center rounded-full transition ${isActive("/notebook") ? "bg-[#fff0ec] text-[#c94a34]" : "text-[#526052] hover:bg-[#e7f0d6]"}`}><Heart className={`size-4 ${isActive("/notebook") ? "fill-current" : ""}`} />{savedCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#ee6145] px-1 text-[10px] font-extrabold leading-none text-white" aria-live="polite" aria-atomic="true">{savedCount}</span>}</Link><Link href="/jobs" className="ml-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#ee6145] px-4 text-sm font-bold text-white shadow-[0_6px_0_#ba422d] transition hover:-translate-y-0.5 hover:bg-[#d94f35] hover:shadow-[0_7px_0_#ba422d]"><Search className="size-4" />开始查询</Link>
        </nav>
        <button type="button" className="grid size-10 place-items-center rounded-full border border-[#dfd9cd] bg-white text-[#172319] md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "关闭菜单" : "打开菜单"}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {open && <nav id="mobile-navigation" className="border-t border-[#dfd9cd] bg-[#f8f5ef] px-4 py-3 md:hidden" aria-label="移动端导航"><div className="mx-auto flex max-w-7xl flex-col gap-1">{links.map((link) => <Link key={link.href} onClick={() => setOpen(false)} href={link.href} className={`rounded-xl px-4 py-3 text-sm font-bold ${isActive(link.href) ? "bg-[#1d402f] text-white" : "text-[#334235]"}`}>{link.label}</Link>)}<Link onClick={() => setOpen(false)} href="/jobs" className="mt-1 rounded-xl bg-[#ee6145] px-4 py-3 text-center text-sm font-bold text-white">开始查询</Link></div></nav>}
    </header>
    </>
  );
}




