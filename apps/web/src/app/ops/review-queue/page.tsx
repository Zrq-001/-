import type { Metadata } from "next";
import { CompanyReviewDesk } from "@/components/company-review-desk";
import { getCompanyReviewQueue } from "@/lib/company-review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "企业复核排期｜蓉小招运营工具",
  description: "仅用于本地安排企业招聘来源复核，不会自动抓取或发布职位。",
  robots: { index: false, follow: false },
};

export default async function CompanyReviewQueuePage() {
  const queue = await getCompanyReviewQueue();
  return <CompanyReviewDesk queue={queue} />;
}
