import type { MetadataRoute } from "next";
import { companies, jobs } from "@/data/catalog";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl ?? "http://localhost:3000";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: base + "/jobs", changeFrequency: "daily", priority: 0.9 },
    { url: base + "/companies", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/about", changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/data-policy", changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { url: base + "/contact", changeFrequency: "monthly", priority: 0.3 },
    ...companies.map((company) => ({ url: base + "/companies/" + company.id, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...jobs.map((job) => ({ url: base + "/jobs/" + encodeURIComponent(job.key), changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
