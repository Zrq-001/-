/**
 * Conservative V1.5 release preparation.
 *
 * Keeps the existing published catalog intact and adds only the newly collected
 * companies marked as official_source=true plus their deduplicated job samples.
 * Raw WorkBuddy files remain in data/incoming/V1.5 for audit.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputDir = path.join(root, "data", "incoming", "V1.5");
const sourceDir = path.join(root, "data", "source");
const catalogPath = path.join(root, "src", "data", "catalog.json");
const summaryPath = path.join(root, "data", "generated", "v15-release-summary.json");

function text(value) { return String(value ?? "").trim(); }
function boolean(value) { return ["true", "是", "yes", "1"].includes(text(value).toLowerCase()); }
function integer(value) { const normalized = text(value); return /^\d+$/.test(normalized) ? Number.parseInt(normalized, 10) : null; }
function sourceTier(row) {
  const code = text(row.source_type_code);
  if (code === "group_unified_recruitment") return "group_career_site";
  if (code === "official_ats_third_party_hosted") return "official_ats";
  if (code === "official_careers_page") return "official_company";
  if (code === "other_official" && text(row.source_tier) === "C") return "official_announcement";
  return text(row.source_tier);
}
function csvCell(value) { const cell = String(value ?? ""); return /[",\r\n]/.test(cell) ? "\"" + cell.replaceAll("\"", "\"\"") + "\"" : cell; }
function writeCsv(headers, rows) { return headers.join(",") + "\n" + rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n") + "\n"; }


function parseCsv(source, filename) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') { field += '"'; index += 1; } else quoted = false;
      } else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (quoted) throw new Error(`${filename} 存在未闭合的双引号。`);
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const filtered = rows.filter((values) => values.some((value) => text(value)));
  const [headers, ...values] = filtered;
  if (!headers?.length) throw new Error(`${filename} 缺少表头。`);
  return values.map((rowValues, rowIndex) => {
    if (rowValues.length !== headers.length) throw new Error(`${filename} 第 ${rowIndex + 2} 行列数不一致。`);
    return Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? ""]));
  });
}

async function readCsv(filename) {
  return parseCsv((await readFile(path.join(inputDir, filename), "utf8")).replace(/^\uFEFF/, ""), filename);
}

function mapCompany(row) {
  return {
    id: text(row.company_id), name: text(row.公司名称),
    aliases: text(row.公司别名).split("|").map((item) => item.trim()).filter(Boolean),
    grade: text(row.企业等级), industry: text(row.所属行业), website: text(row.公司官网),
    officeAddress: text(row.成都办公地点), district: text(row.district), careerUrl: text(row.招聘入口URL),
    careerSourceName: text(row.招聘入口名称), sourceType: text(row.source_type_label),
    sourceTypeCode: text(row.source_type_code), sourceTier: sourceTier(row),
    isOfficial: boolean(row.official_source), chengduRoleStatus: text(row.含成都岗位) || "未知",
    hasChengduRoles: text(row.含成都岗位) === "是", jobCount: integer(row.当前职位数量),
    jobCountConfidence: text(row.job_count_confidence), jobSampleCount: integer(row.职位样本数) ?? 0,
    status: text(row.status_code), statusLabel: text(row.status_label),
    verificationLevel: text(row.verification_level), verificationMethod: text(row.verification_method),
    verifiedAt: text(row.最后验证日期), evidenceUrl: text(row.证据链接), notes: text(row.备注),
    recordCategory: text(row.record_category),
  };
}

function mapJob(row) {
  return {
    key: text(row.job_key), companyId: text(row.company_id), companyName: text(row.公司名称),
    grade: text(row.企业等级), industry: text(row.所属行业), title: text(row.职位名称),
    location: text(row.location_text) || text(row.工作地), district: text(row.district),
    function: text(row.职能类别), recruitmentType: text(row.招聘类型), publishedAt: text(row.发布日期),
    urlType: text(row.url_type), isDirectDetail: boolean(row.is_direct_detail),
    detailUrlConfidence: text(row.detail_url_confidence), applyUrl: text(row.职位详情URL),
    sourceUrl: text(row.来源招聘入口), isOfficial: boolean(row.official_source),
    verifiedAt: text(row.验证日期) || text(row.最近核验日期), notes: text(row.备注),
  };
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const companyRows = await readCsv("企业池_V1.5.csv");
const jobRows = await readCsv("职位池_V1.5.csv");
const oldCompanyIds = new Set(catalog.companies.map((company) => company.id));
const oldJobKeys = new Set(catalog.jobs.map((job) => job.key));
const addedCompanies = companyRows.filter((row) => !oldCompanyIds.has(text(row.company_id)) && boolean(row.official_source)).map(mapCompany);
const addedCompanyIds = new Set(addedCompanies.map((company) => company.id));
const addedJobs = jobRows.filter((row) => addedCompanyIds.has(text(row.company_id)) && !oldJobKeys.has(text(row.job_key)) && boolean(row.official_source)).map(mapJob);

if (addedCompanies.length !== 77 || addedJobs.length !== 250) {
  throw new Error(`V1.5 保守合并数量与审核报告不一致：企业 ${addedCompanies.length}（预期 77），职位 ${addedJobs.length}（预期 250）。`);
}

const companies = [...catalog.companies, ...addedCompanies];
const jobs = [...catalog.jobs, ...addedJobs];
const verifiedAt = companies.map((company) => company.verifiedAt).filter(Boolean).sort().at(-1) ?? "";
const nextCatalog = {
  meta: {
    ...catalog.meta,
    version: "V1.5",
    verifiedAt,
    companyCount: companies.length,
    jobSampleCount: jobs.length,
    officialActiveCompanyCount: companies.filter((company) => company.recordCategory === "official_active").length,
    directJobCount: jobs.filter((job) => job.isDirectDetail).length,
  },
  companies,
  jobs,
};

await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, "utf8");
const publishedCompanyRows = companyRows.filter((row) => oldCompanyIds.has(text(row.company_id)) || addedCompanyIds.has(text(row.company_id))).map((row) => ({ ...row, source_tier: sourceTier(row) }));
const addedJobKeys = new Set(addedJobs.map((job) => job.key));
const publishedJobRows = jobRows.filter((row) => oldJobKeys.has(text(row.job_key)) || addedJobKeys.has(text(row.job_key)));
const companyHeaders = Object.keys(companyRows[0]);
const jobHeaders = Object.keys(jobRows[0]);
await writeFile(path.join(sourceDir, "成都企业池_V1.5.csv"), writeCsv(companyHeaders, publishedCompanyRows), "utf8");
await writeFile(path.join(sourceDir, "成都职位样本_V1.5.csv"), writeCsv(jobHeaders, publishedJobRows), "utf8");
await writeFile(summaryPath, `${JSON.stringify({ version: "V1.5", baseline: { companies: catalog.companies.length, jobs: catalog.jobs.length }, added: { companies: addedCompanies.length, jobs: addedJobs.length }, release: { companies: companies.length, jobs: jobs.length, directJobs: nextCatalog.meta.directJobCount, verifiedAt }, excludedFromFrontend: { reason: "保守发布：V1.5 中非官方来源、第三方线索、未确认记录和既有企业的新增候选暂不进入前台。", companies: companyRows.length - addedCompanies.length - catalog.companies.length, jobs: jobRows.length - addedJobs.length - catalog.jobs.length } }, null, 2)}\n`, "utf8");
console.log(`已准备 V1.5：新增 ${addedCompanies.length} 家企业、${addedJobs.length} 条职位；发布目录共 ${companies.length} 家企业、${jobs.length} 条职位。`);
