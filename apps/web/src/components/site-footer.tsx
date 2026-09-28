import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ded8cd] bg-[#f3efe7] px-4 py-9 text-sm text-[#6c7169] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[#172319]"><ShieldCheck className="size-4 text-[#236b5a]" /><span className="font-extrabold">蓉小招 · 成都招聘入口查询</span></div>
          <p className="mt-2 max-w-2xl leading-6">这里不代替企业发布招聘，只整理企业官网、官方招聘系统和公开招聘公告。职位状态可能随时变化，投递前请以原始招聘页面为准。</p>
          <p className="mt-2 text-xs text-[#8a8d85]">© 2026 蓉小招 · 数据最近核验日期以页面标注为准</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-[#526052]" aria-label="页脚导航">
          <Link className="transition hover:text-[#ee6145]" href="/about">关于蓉小招</Link>
          <Link className="transition hover:text-[#ee6145]" href="/data-policy">数据说明</Link><Link className="transition hover:text-[#ee6145]" href="/privacy">隐私说明</Link><Link className="transition hover:text-[#ee6145]" href="/contact">联系与纠错</Link>
          <Link className="inline-flex items-center gap-1 transition hover:text-[#ee6145]" href="/jobs">开始查询 <ExternalLink className="size-3.5" /></Link>
        </nav>
      </div>
    </footer>
  );
}
