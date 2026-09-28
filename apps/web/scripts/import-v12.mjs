/**
 * Import reviewed V1.3 CSV files into the static catalog consumed by the site.
 *
 * This script deliberately has no third-party dependency: it can run anywhere
 * the Next.js project can run, including a fresh Windows checkout.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "data", "source");
const cliArgs = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const dataVersion = cliArgs.version || "V1.3";
const outputPath = path.join(root, "src", "data", "catalog.json");

function text(value) {
  return (value ?? "").trim();
}

function boolean(value) {
  return ["true", "是", "yes", "1"].includes(text(value).toLowerCase());
}

function integer(value) {
  const normalized = text(value);
  return /^\d+$/.test(normalized) ? Number.parseInt(normalized, 10) : null;
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

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV 中存在未闭合的双引号。");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((values) => values.some((value) => value.trim()));
}

async function readCsv(filename) {
  const source = (await readFile(path.join(sourceDirectory, filename), "utf8")).replace(/^\uFEFF/, "");
  const [headers, ...rows] = parseCsv(source);

  if (!headers) throw new Error(`${filename} 缺少表头。`);

  return rows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`${filename} 第 ${rowIndex + 2} 行有 ${values.length} 列，预期为 ${headers.length} 列。`);
    }

    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

const companyRows = await readCsv(cliArgs.companies || `成都企业池_${dataVersion}.csv`);
const jobRows = await readCsv(cliArgs.jobs || `成都职位样本_${dataVersion}.csv`);

const companies = companyRows.map((row) => ({
  id: text(row.company_id),
  name: text(row.公司名称),
  aliases: text(row.公司别名)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean),
  grade: text(row.企业等级),
  industry: text(row.所属行业),
  website: text(row.公司官网),
  officeAddress: text(row.成都办公地点),
  district: text(row.district),
  careerUrl: text(row.招聘入口URL),
  careerSourceName: text(row.招聘入口名称),
  sourceType: text(row.source_type_label),
  sourceTypeCode: text(row.source_type_code),
  sourceTier: text(row.source_tier),
  isOfficial: boolean(row.official_source),
  // Preserve the source CSV's three-state value; keep the boolean for compatibility.
  chengduRoleStatus: text(row.含成都岗位) || "未知",
  hasChengduRoles: text(row.含成都岗位) === "是",
  jobCount: integer(row.当前职位数量),
  jobCountConfidence: text(row.job_count_confidence),
  jobSampleCount: integer(row.职位样本数) ?? 0,
  status: text(row.status_code),
  statusLabel: text(row.status_label),
  verificationLevel: text(row.verification_level),
  verificationMethod: text(row.verification_method),
  verifiedAt: text(row.最后验证日期),
  evidenceUrl: text(row.证据链接),
  notes: text(row.备注),
  recordCategory: text(row.record_category),
}));

const jobs = jobRows.map((row) => ({
  key: text(row.job_key),
  companyId: text(row.company_id),
  companyName: text(row.公司名称),
  grade: text(row.企业等级),
  industry: text(row.所属行业),
  title: text(row.职位名称),
  location: text(row.location_text) || text(row.工作地),
  district: text(row.district),
  function: text(row.职能类别),
  recruitmentType: text(row.招聘类型),
  publishedAt: text(row.发布日期),
  urlType: text(row.url_type),
  isDirectDetail: text(row.is_direct_detail) === "是",
  detailUrlConfidence: text(row.detail_url_confidence),
  applyUrl: text(row.职位详情URL),
  sourceUrl: text(row.来源招聘入口),
  isOfficial: boolean(row.official_source),
  verifiedAt: text(row.验证日期),
  notes: text(row.备注),
}));

const verifiedAt = companies
  .map((company) => company.verifiedAt)
  .filter(Boolean)
  .sort()
  .at(-1) ?? "";

const catalog = {
  meta: {
    version: dataVersion,
    city: "成都",
    verifiedAt,
    companyCount: companies.length,
    jobSampleCount: jobs.length,
    officialActiveCompanyCount: companies.filter(
      (company) => company.recordCategory === "official_active",
    ).length,
    directJobCount: jobs.filter((job) => job.isDirectDetail).length,
  },
  companies,
  jobs,
};

await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}
`, "utf8");
console.log(`已生成 ${path.relative(root, outputPath)}：${companies.length} 家企业，${jobs.length} 条职位样本。`);





