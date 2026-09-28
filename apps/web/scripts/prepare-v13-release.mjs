/**
 * Prepare the V1.3 release from WorkBuddy's incoming files.
 * Conservative: only direct-merge fields are applied; inferred-location jobs stay out of public catalog.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "source");
const incomingDir = path.join(root, "data", "incoming", "V1.3");
const generatedDir = path.join(root, "data", "generated");

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (quoted) throw new Error("CSV 中存在未闭合的双引号。");
  if (field || row.length > 0) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const [headers, ...values] = rows.filter((items) => items.some((item) => item.trim()));
  if (!headers) throw new Error("CSV 缺少表头。");
  return { headers, rows: values.map((items, index) => {
    if (items.length !== headers.length) throw new Error(`第 ${index + 2} 行列数错误：得到 ${items.length} 列，预期 ${headers.length} 列。`);
    return Object.fromEntries(headers.map((header, itemIndex) => [header, items[itemIndex] ?? ""]));
  }) };
}
function csvCell(value) { const text = String(value ?? ""); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function serializeCsv(headers, rows) { return `\uFEFF${headers.map(csvCell).join(",")}\r\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\r\n")}\r\n`; }
async function readCsv(filename, directory) { return parseCsv((await readFile(path.join(directory, filename), "utf8")).replace(/^\uFEFF/, "")); }
async function writeCsv(filename, directory, table) { await writeFile(path.join(directory, filename), serializeCsv(table.headers, table.rows), "utf8"); }

const baselineCompanies = await readCsv("成都企业池_V1.2.csv", sourceDir);
const baselineJobs = await readCsv("成都职位样本_V1.2.csv", sourceDir);
const incomingCompanies = await readCsv("01_成都企业池_新增_V1.3.csv", incomingDir);
const reviewedCompanies = await readCsv("02_成都企业池_复核更新_V1.3.csv", incomingDir);
const incomingJobs = await readCsv("03_成都职位样本_新增_V1.3.csv", incomingDir);
const changeLog = await readCsv("05_企业变更清单_V1.3.csv", incomingDir);

const mergeableFields = new Map();
const pendingChanges = new Map();
for (const change of changeLog.rows) {
  const companyId = change.company_id;
  if (!mergeableFields.has(companyId)) mergeableFields.set(companyId, new Set());
  if (!pendingChanges.has(companyId)) pendingChanges.set(companyId, []);
  if (change["是否可直接合并"].trim() === "是" && baselineCompanies.headers.includes(change["变更字段"])) mergeableFields.get(companyId).add(change["变更字段"]);
  if (change["是否可直接合并"].trim() !== "是") pendingChanges.get(companyId).push(change);
}
const reviewedById = new Map(reviewedCompanies.rows.map((row) => [row.company_id, row]));
const appliedFields = [];
const mergedCompanies = baselineCompanies.rows.map((row) => {
  const output = { ...row };
  const reviewed = reviewedById.get(row.company_id);
  for (const field of mergeableFields.get(row.company_id) ?? []) {
    if (!reviewed) continue;
    output[field] = reviewed[field];
    appliedFields.push({ company_id: row.company_id, field });
  }
  return output;
});
mergedCompanies.push(...incomingCompanies.rows);

// CD0051 was rechecked separately on 2026-09-27. Keep the evidence-backed
// correction in the repeatable release pipeline so a later WorkBuddy refresh
// cannot accidentally restore the stale V1.2 status/address.
const manualCompanyPatches = new Map([
  ["CD0051", {
    company_id: "CD0051",
    公司名称: "成都天锐星通科技股份有限公司",
    企业等级: "B",
    公司官网: "http://t-ray.net",
    官网已验证: "是",
    成都办公地点: "四川省成都市高新区天府新谷10号楼21层",
    province: "四川省",
    city: "成都市",
    district: "高新区",
    location_text: "四川省成都市高新区天府新谷10号楼21层",
    location_confidence: "confirmed",
    企业来源: "企业官网|高校官方就业网公告",
    招聘入口名称: "就业机会",
    招聘入口URL: "http://www.t-ray.net/channels/29.html",
    source_type_code: "official_careers_page",
    source_type_label: "企业官网自建招聘页",
    招聘系统类型: "企业官网自建招聘页",
    source_tier: "official_company",
    是否官方来源: "是",
    official_source: "true",
    含成都岗位: "未知",
    当前职位数量: "",
    job_count_confidence: "not_available",
    职位样本数: "0",
    status_code: "needs_manual_review",
    status_label: "需人工复核",
    招聘来源状态: "需人工复核",
    verification_level: "source_evidence_only",
    verification_method: "direct_page_visit",
    record_category: "manual_review",
    最后验证日期: "2026-09-27",
    证据链接: "http://t-ray.net/ | http://www.t-ray.net/channels/29.html | https://jy.scu.edu.cn/index/index/employjobdetail.html?data=MDAwMDAwMDAwMJG6n3_Ed6imi4qQtLh4Y9-K0NSyyWHddricp9CWi5qikaeWacSdqLqGfaK2w4iil5C4zNbGiL-E | https://jy.scu.edu.cn/index/index/employjobdetail.html?data=MDAwMDAwMDAwMJG6n3_Ed6imi4qQtLh4Y9-K0NSqspzddricp9CWi5qikaeWacSdqLqGfaK2w4iil5C4zNbGiL-E | https://career.hit.edu.cn/zhxy-xszyfzpt/zpxx/zpxxxq?id=ODcyNGY2ZTAyYmU5NGQ3M2E4NGFiOGRlNmE5ZDFjMmI=",
    职位复检结果: "",
    分级理由: "官方官网招聘入口真实存在，但页面为无日期静态 JD，当前是否仍在招聘无法确认；保留入口并转人工复核。",
    备注: "官网“就业机会”页可访问并存在岗位 JD，但页面无发布日期、更新提示、在线投递按钮或当前职位列表；近期高校招聘公告有效期已结束，当前是否仍在招聘无法确认。官方入口存在，但不应标记为官方有效在招或立即投递。",
  }],
]);
const manualPatchesApplied = [];
for (const [companyId, patch] of manualCompanyPatches) {
  const row = mergedCompanies.find((company) => company.company_id === companyId);
  if (!row) {
    console.warn(`人工核验补丁 ${companyId} 未找到企业记录，跳过。`);
    continue;
  }
  Object.assign(row, patch);
  manualPatchesApplied.push(companyId);
}
const confirmedJobs = incomingJobs.rows.filter((row) => row.location_confidence.trim() === "confirmed");
const inferredJobs = incomingJobs.rows.filter((row) => row.location_confidence.trim() === "inferred");
const mergedJobs = [...baselineJobs.rows, ...confirmedJobs];
await mkdir(generatedDir, { recursive: true });
await writeCsv("成都企业池_V1.3.csv", sourceDir, { headers: baselineCompanies.headers, rows: mergedCompanies });
await writeCsv("成都职位样本_V1.3.csv", sourceDir, { headers: baselineJobs.headers, rows: mergedJobs });
const pendingEntries = [...pendingChanges.entries()].filter(([companyId, rows]) => rows.length > 0 && !manualPatchesApplied.includes(companyId));
const summary = {
  generatedAt: new Date().toISOString(),
  baseline: { companies: baselineCompanies.rows.length, jobs: baselineJobs.rows.length },
  incoming: { newCompanies: incomingCompanies.rows.length, reviewedCompanies: reviewedCompanies.rows.length, newJobs: incomingJobs.rows.length, confirmedNewJobs: confirmedJobs.length, inferredNewJobsExcluded: inferredJobs.length },
  release: { companies: mergedCompanies.length, jobs: mergedJobs.length, safeCompanyFieldsApplied: appliedFields.length, manualPatchesApplied, pendingChangeRows: pendingEntries.reduce((total, [, rows]) => total + rows.length, 0), pendingCompanyIds: pendingEntries.map(([id]) => id).sort() },
  appliedFields,
  excludedInferredJobs: inferredJobs.map((row) => ({ job_key: row.job_key, company_id: row.company_id, title: row["职位名称"], location: row.location_text, url: row["职位详情URL"] })),
  pendingChanges: Object.fromEntries(pendingEntries),
};
await writeFile(path.join(generatedDir, "v13-release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`已准备 V1.3：${mergedCompanies.length} 家企业，${mergedJobs.length} 条职位样本。`);
console.log(`已应用安全字段变更：${appliedFields.length} 条；待人工复核：${summary.release.pendingChangeRows} 条。`);
console.log(`已暂缓 inferred 地点职位：${inferredJobs.length} 条。`);
