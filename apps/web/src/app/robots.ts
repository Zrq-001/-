import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/ops/"] }, sitemap: base + "/sitemap.xml" };
}
