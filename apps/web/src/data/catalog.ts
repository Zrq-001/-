import catalogJson from "./catalog.json";

export type Company = (typeof catalogJson.companies)[number];
export type Job = (typeof catalogJson.jobs)[number];
export type CatalogMeta = typeof catalogJson.meta;

export const catalog = catalogJson;
export const companies = catalog.companies;
export const jobs = catalog.jobs;
export const catalogMeta = catalog.meta;

export const activeCompanies = companies.filter((company) => company.status === "active");
export const officialCompanies = companies.filter((company) => company.isOfficial);

export function getCompany(companyId: string) {
  return companies.find((company) => company.id === companyId);
}

export function getCompanyJobs(companyId: string) {
  return jobs.filter((job) => job.companyId === companyId);
}

export function getJob(jobKey: string) {
  return jobs.find((job) => job.key === jobKey);
}
