/**
 * Conservative V1.4 release preparation.
 * Keeps only official companies and confirmed Chengdu job locations.
 * Raw WorkBuddy files remain in data/incoming/V1.4 for audit.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "source");
const incomingDir = path.join(root, "data", "incoming", "V1.4");
const generatedDir = path.join(root, "data", "generated");

const trim = (value) => String(value ?? "").trim();
const isUrl = (value) => /^https?:\/\/\S+$/i.test(trim(value));

function parseCsv(source, filename) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (quoted) throw new Error(`${filename} 存在未闭合的双引号。`);
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const filtered = rows.filter((values) => values.some((value) => trim(value)));
  const [headers, ...values] = filtered;
  if (!headers) throw new Error(`${filename} 缺少表头。`);
  return { headers, rows: values.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`${filename} 第 ${index + 2} 行列数错误。`);
    return Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex] ?? ""]));
  }) };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function serializeCsv(headers, rows) {
  return `\uFEFF${headers.map(csvCell).join(",")}\r\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\r\n")}\r\n`;
}
async function readCsv(directory, filename) {
  return parseCsv((await readFile(path.join(directory, filename), "utf8")).replace(/^\uFEFF/, ""), filename);
}
async function writeCsv(directory, filename, table) {
  await writeFile(path.join(directory, filename), serializeCsv(table.headers, table.rows), "utf8");
}

const baselineCompanies = await readCsv(sourceDir, "成都企业池_V1.3.csv");
const baselineJobs = await readCsv(sourceDir, "成都职位样本_V1.3.csv");
const incomingCompanies = await readCsv(incomingDir, "成都企业池_V1.4.csv");
const incomingJobs = await readCsv(incomingDir, "成都职位样本_V1.4.csv");

const rejectedCompanies = [];
const acceptedCompanyRows = incomingCompanies.rows.filter((row) => {
  if (trim(row.official_source).toLowerCase() !== "true") {
    rejectedCompanies.push({ company_id: row.company_id, name: row.公司名称, reason: "非官方来源，暂不进入公开目录" });
    return false;
  }
  if (!isUrl(row.招聘入口URL)) row.招聘入口URL = "";
  return true;
});

const companyById = new Map(baselineCompanies.rows.filter((row) => trim(row.official_source).toLowerCase() === "true").map((row) => [row.company_id, { ...row }]));
const keptIncomingIds = new Set();
for (const row of acceptedCompanyRows) {
  companyById.set(row.company_id, { ...row });
  keptIncomingIds.add(row.company_id);
}
const mergedCompanies = [...companyById.values()].sort((a, b) => a.company_id.localeCompare(b.company_id));
const mergedCompanyIds = new Set(mergedCompanies.map((row) => row.company_id));

const rejectedJobs = [];
const acceptedJobs = incomingJobs.rows.filter((row) => {
  if (!mergedCompanyIds.has(row.company_id)) {
    rejectedJobs.push({ job_key: row.job_key, company_id: row.company_id, title: row.职位名称, reason: "所属企业未进入公开目录" });
    return false;
  }
  if (trim(row.location_confidence) !== "confirmed") {
    rejectedJobs.push({ job_key: row.job_key, company_id: row.company_id, title: row.职位名称, reason: `工作地点置信度为 ${row.location_confidence || "未说明"}` });
    return false;
  }
  if (!isUrl(row.职位详情URL)) {
    row.职位详情URL = "";
    row.url_type = "listing_page";
    row.is_direct_detail = "否";
    row.detail_url_confidence = "not_available";
  }
  return true;
});

const jobByKey = new Map(baselineJobs.rows.map((row) => [row.job_key, { ...row }]));
const fallbackKey = (row) => `${row.company_id}|${trim(row.职位名称)}|${trim(row.location_text || row.工作地)}`.toLowerCase();
const jobByFallback = new Map(baselineJobs.rows.map((row) => [fallbackKey(row), row.job_key]));
for (const row of acceptedJobs) {
  const existingKey = jobByKey.has(row.job_key) ? row.job_key : jobByFallback.get(fallbackKey(row));
  if (existingKey) jobByKey.set(existingKey, { ...row, job_key: existingKey });
  else jobByKey.set(row.job_key, { ...row });
}
const mergedJobs = [...jobByKey.values()];

await mkdir(generatedDir, { recursive: true });
const companyTable = { headers: baselineCompanies.headers, rows: mergedCompanies };
const jobTable = { headers: baselineJobs.headers, rows: mergedJobs };
await writeCsv(sourceDir, "成都企业池_V1.4.csv", companyTable);
await writeCsv(sourceDir, "成都职位样本_V1.4.csv", jobTable);

const summary = {
  generatedAt: new Date().toISOString(),
  policy: { keepOfficialCompaniesOnly: true, keepConfirmedJobLocationsOnly: true, preserveRawIncoming: true },
  baseline: { companies: baselineCompanies.rows.length, jobs: baselineJobs.rows.length },
  incoming: { companies: incomingCompanies.rows.length, jobs: incomingJobs.rows.length },
  release: { companies: mergedCompanies.length, jobs: mergedJobs.length, acceptedIncomingCompanies: acceptedCompanyRows.length, acceptedIncomingJobs: acceptedJobs.length },
  rejected: { companies: rejectedCompanies.length, jobs: rejectedJobs.length },
  rejectedCompanies,
  rejectedJobs,
};
await writeFile(path.join(generatedDir, "v14-release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`已准备 V1.4：${mergedCompanies.length} 家企业，${mergedJobs.length} 条职位。`);
console.log(`已保留本轮官方企业 ${acceptedCompanyRows.length} 家、确认地点职位 ${acceptedJobs.length} 条。`);
console.log(`已暂缓非官方企业 ${rejectedCompanies.length} 家、非 confirmed 地点职位 ${rejectedJobs.length} 条。`);
