/**
 * Validate source CSVs and the generated catalog before a data release.
 * Errors block a release; warnings flag records that deserve a manual recheck.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "data", "source");
const cliArgs = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const dataVersion = cliArgs.version || "V1.3";
const catalogPath = path.join(root, "src", "data", "catalog.json");
const reviewPolicyPath = path.join(root, "data", "review-policy.json");

const requiredCompanyColumns = [
  "company_id",
  "公司名称",
  "公司官网",
  "招聘入口URL",
  "source_tier",
  "official_source",
  "status_code",
  "最后验证日期",
  "record_category",
];

const requiredJobColumns = [
  "job_key",
  "company_id",
  "公司名称",
  "职位名称",
  "url_type",
  "is_direct_detail",
  "职位详情URL",
  "official_source",
  "验证日期",
];

const errors = [];
const warnings = [];

function report(level, message) {
  (level === "error" ? errors : warnings).push(message);
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }

  if (quoted) throw new Error("CSV 中存在未闭合的双引号。");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim()));
}

async function readCsv(filename) {
  const raw = (await readFile(path.join(sourceDirectory, filename), "utf8")).replace(/^\uFEFF/, "");
  const [headers, ...rows] = parseCsv(raw);
  if (!headers) throw new Error(`${filename} 缺少表头。`);

  for (const [index, values] of rows.entries()) {
    if (values.length !== headers.length) {
      report("error", `${filename} 第 ${index + 2} 行列数错误：得到 ${values.length} 列，预期 ${headers.length} 列。`);
    }
  }

  return {
    headers,
    rows: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
  };
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (!value) {
      report("error", `${label} 存在空值。`);
    } else if (seen.has(value)) {
      report("error", `${label} 重复：${value}`);
    } else {
      seen.add(value);
    }
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function validateColumns(filename, headers, requiredColumns) {
  for (const column of requiredColumns) {
    if (!headers.includes(column)) {
      report("error", `${filename} 缺少必填列「${column}」。`);
    }
  }
}

const companiesSource = await readCsv(`成都企业池_${dataVersion}.csv`);
const jobsSource = await readCsv(`成都职位样本_${dataVersion}.csv`);
const reviewPolicy = JSON.parse(await readFile(reviewPolicyPath, "utf8"));

if (!reviewPolicy.default || !reviewPolicy.tiers) {
  report("error", "review-policy.json 需要包含 default 和 tiers。");
} else {
  const sourceTiers = new Set(companiesSource.rows.map((row) => row.source_tier?.trim()).filter(Boolean));
  for (const tier of sourceTiers) {
    const policy = reviewPolicy.tiers[tier] ?? reviewPolicy.default;
    if (!reviewPolicy.tiers[tier]) report("warning", `review-policy.json 未单独配置来源类型 ${tier}，将使用 default。`);
    if (!Number.isInteger(policy.cadenceDays) || policy.cadenceDays < 1) report("error", `来源类型 ${tier} 的 cadenceDays 必须是大于 0 的整数。`);
    if (!["manual_first", "automation_candidate"].includes(policy.reviewMode)) report("error", `来源类型 ${tier} 的 reviewMode 无效。`);
    if (!Array.isArray(policy.checklist) || policy.checklist.length === 0) report("error", `来源类型 ${tier} 缺少复核清单。`);
  }
}

validateColumns(`成都企业池_${dataVersion}.csv`, companiesSource.headers, requiredCompanyColumns);
validateColumns(`成都职位样本_${dataVersion}.csv`, jobsSource.headers, requiredJobColumns);

unique(companiesSource.rows.map((row) => row.company_id?.trim()), "企业池 company_id");
unique(jobsSource.rows.map((row) => row.job_key?.trim()), "职位样本 job_key");

const companyIds = new Set(companiesSource.rows.map((row) => row.company_id?.trim()));
for (const [index, row] of companiesSource.rows.entries()) {
  const prefix = `企业池第 ${index + 2} 行（${row.company_id || "缺少 ID"}）`;
  const official = ["true", "是", "yes", "1"].includes((row.official_source ?? "").trim().toLowerCase());
  const activeOfficial = official && row.record_category?.trim() === "official_active";

  if (!row.公司名称?.trim()) report("error", `${prefix} 缺少公司名称。`);
  if (row.最后验证日期?.trim() && !isIsoDate(row.最后验证日期.trim())) report("error", `${prefix} 最后验证日期不是 YYYY-MM-DD。`);
  if (row.公司官网?.trim() && !isHttpUrl(row.公司官网.trim())) report("error", `${prefix} 公司官网不是 http(s) URL。`);
  if (row.招聘入口URL?.trim() && !isHttpUrl(row.招聘入口URL.trim())) report("error", `${prefix} 招聘入口 URL 不是 http(s) URL。`);
  if (activeOfficial && !row.招聘入口URL?.trim()) report("warning", `${prefix} 标为 official_active，但没有可访问的招聘入口 URL；请确认是否应补充公开链接或保留人工投递说明。`);
  if (official && !["official_company", "official_ats", "group_career_site", "official_announcement", "official_wechat"].includes(row.source_tier?.trim())) report("warning", `${prefix} 标为官方来源，但 source_tier 不属于已知官方来源分级，请复核。`);
}

for (const [index, row] of jobsSource.rows.entries()) {
  const prefix = `职位样本第 ${index + 2} 行（${row.job_key || "缺少 key"}）`;
  if (!row.公司名称?.trim()) report("error", `${prefix} 缺少公司名称。`);
  if (!row.职位名称?.trim()) report("error", `${prefix} 缺少职位名称。`);
  if (!companyIds.has(row.company_id?.trim())) report("error", `${prefix} company_id 不存在于企业池：${row.company_id || "空"}。`);
  if (row.验证日期?.trim() && !isIsoDate(row.验证日期.trim())) report("error", `${prefix} 验证日期不是 YYYY-MM-DD。`);
  if (row.职位详情URL?.trim() && !isHttpUrl(row.职位详情URL.trim())) report("error", `${prefix} 职位详情 URL 不是 http(s) URL。`);
  if (row.来源招聘入口?.trim() && !isHttpUrl(row.来源招聘入口.trim())) report("error", `${prefix} 来源招聘入口不是 http(s) URL。`);
  if (row.is_direct_detail?.trim() === "是" && !row.职位详情URL?.trim()) report("error", `${prefix} 标为可直达详情页，但缺少职位详情 URL。`);
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
if (!Array.isArray(catalog.companies) || !Array.isArray(catalog.jobs) || !catalog.meta) {
  report("error", "catalog.json 结构不完整：需要 meta、companies、jobs。");
} else {
  unique(catalog.companies.map((company) => company.id), "catalog company id");
  unique(catalog.jobs.map((job) => job.key), "catalog job key");

  if (catalog.meta.companyCount !== catalog.companies.length) report("error", `catalog meta.companyCount=${catalog.meta.companyCount}，实际为 ${catalog.companies.length}。`);
  if (catalog.meta.jobSampleCount !== catalog.jobs.length) report("error", `catalog meta.jobSampleCount=${catalog.meta.jobSampleCount}，实际为 ${catalog.jobs.length}。`);

  const officialActiveCount = catalog.companies.filter((company) => company.recordCategory === "official_active").length;
  const directJobCount = catalog.jobs.filter((job) => job.isDirectDetail).length;
  if (catalog.meta.officialActiveCompanyCount !== officialActiveCount) report("error", `catalog meta.officialActiveCompanyCount=${catalog.meta.officialActiveCompanyCount}，实际为 ${officialActiveCount}。`);
  if (catalog.meta.directJobCount !== directJobCount) report("error", `catalog meta.directJobCount=${catalog.meta.directJobCount}，实际为 ${directJobCount}。`);

  const catalogCompanyIds = new Set(catalog.companies.map((company) => company.id));
  for (const job of catalog.jobs) {
    if (!catalogCompanyIds.has(job.companyId)) report("error", `catalog 职位 ${job.key} 关联了不存在的企业 ${job.companyId}。`);
    if (job.isDirectDetail && !isHttpUrl(job.applyUrl)) report("error", `catalog 职位 ${job.key} 标为可直达，但 applyUrl 不合法。`);
  }

  const sourceCompanyNames = new Map(companiesSource.rows.map((row) => [row.company_id?.trim(), row.公司名称?.trim()]));
  for (const company of catalog.companies) {
    if (sourceCompanyNames.get(company.id) !== company.name) report("error", `catalog 企业 ${company.id} 与源 CSV 的名称不一致。请先重新导入。`);
  }

  if (catalog.companies.length !== companiesSource.rows.length || catalog.jobs.length !== jobsSource.rows.length) {
    report("error", "catalog 的记录数与源 CSV 不一致。请先运行 pnpm data:import。");
  }
}

console.log("\n数据质量检查");
console.log("=".repeat(36));
console.log(`企业源数据：${companiesSource.rows.length} 条`);
console.log(`职位源数据：${jobsSource.rows.length} 条`);
console.log(`错误：${errors.length} 条；待人工复核：${warnings.length} 条`);

for (const message of warnings) console.log(`⚠ ${message}`);
for (const message of errors) console.error(`✖ ${message}`);

if (errors.length > 0) {
  console.error("\n数据检查未通过：请修复错误后再发布。\n");
  process.exitCode = 1;
} else {
  console.log("\n✓ 数据结构与发布约束检查通过。\n");
}

