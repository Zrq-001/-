const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteUrl = rawSiteUrl && /^https?:\/\/\S+$/i.test(rawSiteUrl)
  ? rawSiteUrl.replace(/\/$/, "")
  : undefined;

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined;
