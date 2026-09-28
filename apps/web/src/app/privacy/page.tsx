import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HardDrive, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "隐私说明｜蓉小招", description: "蓉小招如何处理你的本地收藏、笔记与反馈信息。" };

export default function PrivacyPage() {
  return <><SiteHeader /><main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#236b5a] hover:bg-[#e7f0d6]"><ArrowLeft className="size-4" />回到首页</Link>
    <article className="mt-4 overflow-hidden rounded-[32px] border border-[#ded8cd] bg-[#fffdfa] shadow-[0_13px_35px_rgba(46,51,38,.08)]"><div className="bg-[#edf3e4] px-6 py-9 sm:px-10 sm:py-12"><p className="eyebrow text-[#236b5a]">PRIVACY</p><h1 className="display-title mt-3 text-4xl text-[#172319] sm:text-5xl">隐私说明</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#526052]">最后更新：2026年9月28日。我们用尽量直白的方式说明目前这版网站会做什么、不会做什么。</p></div><div className="space-y-7 px-6 py-8 sm:px-10"><section><HardDrive className="size-6 text-[#ee6145]" /><h2 className="mt-3 text-xl font-extrabold">收藏和小本本留在你的设备里</h2><p className="mt-2 text-sm leading-7 text-[#657064]">收藏、浏览记录、投递状态和个人备注使用浏览器本地存储保存。蓉小招当前不会创建用户账号，也不会把这些内容上传到服务器。清除浏览器网站数据或更换设备后，这些本地记录可能消失。</p></section><section><ShieldCheck className="size-6 text-[#236b5a]" /><h2 className="mt-3 text-xl font-extrabold">不收集简历和敏感证件</h2><p className="mt-2 text-sm leading-7 text-[#657064]">蓉小招不要求你上传简历、身份证、银行卡、密码或验证码。投递会跳转至企业原始招聘页面，请自行确认页面归属与安全性。</p></section><section><h2 className="text-xl font-extrabold">反馈信息</h2><p className="mt-2 text-sm leading-7 text-[#657064]">当你主动通过邮件或其他公开渠道反馈问题时，我们只会将你提供的信息用于核验、修正招聘链接或回复问题。请不要在反馈中发送身份证号、银行卡号、账号密码等敏感信息。</p></section></div></article>
  </main></>;
}
