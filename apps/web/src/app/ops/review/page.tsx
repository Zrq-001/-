import type { Metadata } from "next";
import { SourceReviewDesk } from "@/components/source-review-desk";
import { getSourceReviewQueue } from "@/lib/source-review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "来源审核台｜蓉小招运营工具",
  description: "仅用于本地审核官方招聘来源扫描结果，不会自动发布职位。",
  robots: { index: false, follow: false },
};

export default async function SourceReviewPage() {
  const queue = await getSourceReviewQueue();
  return <SourceReviewDesk queue={queue} />;
}
