const canonicalProductionUrl = "https://rongxiaozhao.cn";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelSiteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

const normalize = (value: string) => (value.startsWith("http") ? value : `https://${value}`).replace(/\/$/, "");

export const siteUrl = process.env.VERCEL_ENV === "production"
  ? canonicalProductionUrl
  : configuredSiteUrl
    ? normalize(configuredSiteUrl)
    : vercelSiteUrl
      ? normalize(vercelSiteUrl)
      : undefined;

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined;