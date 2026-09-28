import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "蓉小招｜成都企业招聘入口查询", template: "%s｜蓉小招" },
  description: "帮成都求职者更快找到企业官网、官方招聘系统和可核验的职位线索。",
  applicationName: "蓉小招",
  keywords: ["成都招聘", "企业官网招聘", "官方招聘入口", "成都求职", "蓉小招"],
  openGraph: { type: "website", locale: "zh_CN", siteName: "蓉小招", title: "蓉小招｜成都企业招聘入口查询", description: "查企业官网、官方招聘系统和可核验的职位线索。" },
  twitter: { card: "summary", title: "蓉小招｜成都企业招聘入口查询", description: "查企业官网、官方招聘系统和可核验的职位线索。" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}<SiteFooter /></body></html>;
}
