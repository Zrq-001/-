/**
 * Produce a lightweight freshness report for manual maintenance.
 * It never changes catalog data or decides that a job is closed.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "src", "data", "catalog.json");
const policyPath = path.join(root, "data", "review-policy.json");
const outputPath = path.join(root, "data", "generated", "data-health.json");

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function today() {
  const value = arg("as-of");
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(from, to) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

const asOf = today();
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const policy = JSON.parse(await readFile(policyPath, "utf8"));
const sourceReview = (company) => policy.tiers?.[company.sourceTier] ?? policy.default ?? { cadenceDays: 30, reviewMode: "manual_first" };

const overdueCompanies = [];
const dueSoonCompanies = [];
const missingEvidenceCompanies = [];
for (const company of catalog.companies) {
  const review = sourceReview(company);
  const verifiedAt = company.verifiedAt || null;
  const ageDays = verifiedAt ? dayDiff(verifiedAt, asOf) : null;
  const daysUntilDue = ageDays === null ? null : review.cadenceDays - ageDays;
  const record = { id: company.id, name: company.name, sourceTier: company.sourceTier, verifiedAt, ageDays, cadenceDays: review.cadenceDays, daysUntilDue, reviewMode: review.reviewMode };
  if (!verifiedAt || daysUntilDue < 0) overdueCompanies.push(record);
  else if (daysUntilDue <= 3) dueSoonCompanies.push(record);
  if (company.isOfficial && company.status === "active" && !company.careerUrl) missingEvidenceCompanies.push({ id: company.id, name: company.name, status: company.status, reason: "官方有效企业缺少招聘入口 URL" });
}

const directJobsMissingUrl = catalog.jobs.filter((job) => job.isDirectDetail && !job.sourceUrl).map((job) => ({ key: job.key, title: job.title, companyId: job.companyId }));
const jobsMissingVerification = catalog.jobs.filter((job) => !job.verifiedAt).map((job) => ({ key: job.key, title: job.title, companyId: job.companyId }));
const report = {
  generatedAt: new Date().toISOString(),
  asOf,
  catalogVersion: catalog.meta.version,
  summary: {
    companies: catalog.companies.length,
    jobs: catalog.jobs.length,
    overdueCompanies: overdueCompanies.length,
    dueSoonCompanies: dueSoonCompanies.length,
    missingEvidenceCompanies: missingEvidenceCompanies.length,
    directJobsMissingUrl: directJobsMissingUrl.length,
    jobsMissingVerification: jobsMissingVerification.length,
  },
  rule: "这是维护提示，不代表职位已关闭；所有变更仍需人工查看官方页面后修改源 CSV。",
  overdueCompanies,
  dueSoonCompanies,
  missingEvidenceCompanies,
  directJobsMissingUrl,
  jobsMissingVerification,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`数据健康报告：${outputPath}`);
console.log(`核验日期：${asOf}`);
console.log(`企业 ${catalog.companies.length} 家；职位 ${catalog.jobs.length} 条`);
console.log(`需要复核：逾期企业 ${overdueCompanies.length} 家；3 天内到期 ${dueSoonCompanies.length} 家；缺少官方入口 ${missingEvidenceCompanies.length} 家；直达职位缺链接 ${directJobsMissingUrl.length} 条；职位缺验证日期 ${jobsMissingVerification.length} 条。`);
