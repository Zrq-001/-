const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const siteUrl = rawSiteUrl
  ? (rawSiteUrl.startsWith("http") ? rawSiteUrl : `https://${rawSiteUrl}`).replace(/\/$/, "")
  : undefined;

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined;
