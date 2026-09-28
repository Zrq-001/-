import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Mail, ShieldAlert } from "lucide-react";
import { ReportIssueButton } from "@/components/report-issue-button";
import { SiteHeader } from "@/components/site-header";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = { title: "联系与纠错｜蓉小招", description: "反馈招聘入口失效、职位信息变化或企业资料补充。" };

export default function ContactPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"><ArrowLeft className="size-4" />回到首页</Link>
    <article className="mt-4 overflow-hidden rounded-[32px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_13px_35px_rgba(46,51,38,.08)]"><div className="bg-[#fff0df] px-6 py-9 sm:px-10 sm:py-12"><p className="eyebrow text-[#c94a34]">CONTACT & CORRECTION</p><h1 className="display-title mt-3 text-4xl text-[#172319] sm:text-5xl">发现问题，告诉我们。</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#657064]">招聘信息变化很快。发现入口失效、企业名称不准确、职位已结束或有新的官方招聘入口，都欢迎反馈。</p></div><div className="space-y-6 px-6 py-8 sm:px-10"><section className="rounded-[24px] bg-[#edf3e4] p-5"><ClipboardCheck className="size-6 text-[#236b5a]" /><h2 className="mt-3 text-xl font-extrabold">反馈时请带上这些内容</h2><p className="mt-2 text-sm leading-7 text-[#526052]">企业或职位名称、当前页面链接、你发现的问题、可核验的官方证据链接。职位或企业详情页上的“信息有误？复制反馈”按钮可以自动整理模板。</p><div className="mt-4"><ReportIssueButton kind="企业" itemId="general" title="一般信息反馈" /></div></section>{contactEmail ? <section><Mail className="size-6 text-[#ee6145]" /><h2 className="mt-3 text-xl font-extrabold">联系邮箱</h2><a href={`mailto:${contactEmail}?subject=${encodeURIComponent("蓉小招信息反馈")}`} className="mt-2 inline-flex break-all text-base font-extrabold text-[#236b5a] hover:text-[#ee6145]">{contactEmail}</a><p className="mt-2 text-sm leading-7 text-[#657064]">请勿在邮件中发送身份证、银行卡、账号密码或验证码。</p></section> : <section className="rounded-[24px] border border-dashed border-[#e0b987] bg-[#fff8ee] p-5"><ShieldAlert className="size-6 text-[#a7710e]" /><h2 className="mt-3 text-xl font-extrabold text-[#805021]">公开测试前需配置反馈邮箱</h2><p className="mt-2 text-sm leading-7 text-[#805021]">当前站点尚未配置公开反馈邮箱。维护者部署前请设置 <code>NEXT_PUBLIC_CONTACT_EMAIL</code>，此处会自动显示可联系地址。</p></section>}</div></article>
  </main></>;
}
