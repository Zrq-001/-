/**
 * Read-only preflight for a new reviewed catalog drop.
 * Usage: pnpm data:preflight -- --version=V1.4
 * Or:    pnpm data:preflight -- --input="C:\path\to\V1.4" --version=V1.4
 */
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const version = args.version || "V1.4";
const inputDir = path.resolve(root, args.input || path.join("data", "incoming", version));
const catalogPath = path.join(root, "src", "data", "catalog.json");
const generatedDir = path.join(root, "data", "generated");

function text(value) { return String(value ?? "").trim(); }
function pick(row, names) { return text(names.map((name) => row[name]).find((value) => text(value))); }
function isUrl(value) { return /^https?:\/\/[^\s]+$/i.test(value); }
function normalize(value) { return text(value).toLowerCase().replace(/[\s《》「」“”‘’'"()（）【】[\]，。,.：:；;、/\\_-]+/g, ""); }

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
  return { headers, rows: values.map((values, rowIndex) => {
    if (values.length !== headers.length) throw new Error(`${filename} 第 ${rowIndex + 2} 行有 ${values.length} 列，预期 ${headers.length} 列。`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  }) };
}

async function findFile(patterns, excluded = new Set()) {
  const files = await readdir(inputDir);
  for (const pattern of patterns) {
    const exact = files.find((file) => file === pattern && !excluded.has(file));
    if (exact) return path.join(inputDir, exact);
  }
  const match = files.find((file) => /\.csv$/i.test(file) && !excluded.has(file) && patterns.some((pattern) => {
    const keyword = pattern.replace(/\.csv$/i, "");
    return file.includes(keyword);
  }));
  return match ? path.join(inputDir, match) : null;
}

const errors = [];
const warnings = [];
const duplicate = (values, label) => {
  const seen = new Map();
  for (const [index, value] of values.entries()) {
    if (!value) continue;
    const rows = seen.get(value) || [];
    rows.push(index + 2);
    seen.set(value, rows);
  }
  for (const [value, rows] of seen) if (rows.length > 1) warnings.push(`${label}重复：${value}（第 ${rows.join(", ")} 行）`);
};

try {
  await access(inputDir);
  const companyFile = await findFile([`成都企业池_${version}.csv`, `企业池_${version}.csv`, "成都企业池.csv", "企业池.csv"]);
  const jobFile = await findFile([`成都职位样本_${version}.csv`, `成都职位池_${version}.csv`, `职位池_${version}.csv`, "成都职位样本.csv", "职位池.csv", "职位样本.csv"], new Set([path.basename(companyFile || "")]));
  if (!companyFile) errors.push(`未找到企业 CSV：${inputDir}`);
  if (!jobFile) errors.push(`未找到职位 CSV：${inputDir}`);
  if (errors.length) throw new Error(errors.join("\n"));

  const companiesTable = parseCsv((await readFile(companyFile, "utf8")).replace(/^\uFEFF/, ""), path.basename(companyFile));
  const jobsTable = parseCsv((await readFile(jobFile, "utf8")).replace(/^\uFEFF/, ""), path.basename(jobFile));
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const oldCompanyIds = new Set(catalog.companies.map((row) => text(row.id)));
  const oldCompanyNames = new Set(catalog.companies.map((row) => normalize(row.name)));
  const oldJobKeys = new Set(catalog.jobs.map((row) => text(row.key)));
  const oldJobUrls = new Set(catalog.jobs.map((row) => text(row.applyUrl || row.sourceUrl)).filter(Boolean));
  const likelyFullSnapshot = companiesTable.rows.length >= Math.max(20, catalog.companies.length * 0.75);
  const companyIds = companiesTable.rows.map((row) => pick(row, ["company_id", "企业ID", "企业编号", "企业代码"]));
  const companyNames = companiesTable.rows.map((row) => pick(row, ["公司名称", "企业名称", "company_name"]));
  const jobKeys = jobsTable.rows.map((row) => pick(row, ["job_key", "职位ID", "职位编号", "job_id"]));
  const jobUrls = jobsTable.rows.map((row) => pick(row, ["职位详情URL", "职位链接", "岗位链接", "url", "source_url"]));

  duplicate(companyIds, "企业 ID");
  duplicate(companyNames.map(normalize), "企业名称");
  duplicate(jobKeys, "职位 key");


  for (const [index, row] of companiesTable.rows.entries()) {
    const line = `企业第 ${index + 2} 行`;
    const id = companyIds[index];
    const name = companyNames[index];
    const website = pick(row, ["公司官网", "官网", "website"]);
    const career = pick(row, ["招聘入口URL", "招聘入口", "career_url"]);
    if (!id) errors.push(`${line} 缺少 company_id。`);
    if (!name) errors.push(`${line} 缺少公司名称。`);
    if (website && !isUrl(website)) errors.push(`${line} 公司官网不是 http(s) URL：${website}`);
    if (career && !isUrl(career)) errors.push(`${line} 招聘入口不是 http(s) URL：${career}`);
    if (!likelyFullSnapshot && id && oldCompanyIds.has(id)) warnings.push(`${line} company_id 已存在：${id}`);
    if (!likelyFullSnapshot && name && oldCompanyNames.has(normalize(name))) warnings.push(`${line} 企业名称疑似已存在：${name}`);
  }

  for (const [index, row] of jobsTable.rows.entries()) {
    const line = `职位第 ${index + 2} 行`;
    const key = jobKeys[index];
    const companyId = pick(row, ["company_id", "企业ID", "企业编号"]);
    const title = pick(row, ["职位名称", "岗位名称", "title"]);
    const url = jobUrls[index];
    const source = pick(row, ["来源招聘入口", "来源链接", "source_url"]);
    const verifiedAt = pick(row, ["验证日期", "最后验证日期", "核验日期", "verified_at"]);
    if (!key) errors.push(`${line} 缺少 job_key。`);
    if (!companyId) errors.push(`${line} 缺少 company_id。`);
    if (!title) errors.push(`${line} 缺少职位名称。`);
    if (url && !isUrl(url)) errors.push(`${line} 职位 URL 不是 http(s) URL：${url}`);
    if (source && !isUrl(source)) errors.push(`${line} 来源 URL 不是 http(s) URL：${source}`);
    if (!verifiedAt) warnings.push(`${line} 缺少验证日期：${title || key || "未命名职位"}`);
    if (!likelyFullSnapshot && key && oldJobKeys.has(key)) warnings.push(`${line} job_key 已存在：${key}`);
    if (!likelyFullSnapshot && url && oldJobUrls.has(url)) warnings.push(`${line} 职位 URL 已存在：${url}`);
  }

  const companyIdSet = new Set(companyIds.filter(Boolean));
  for (const [index, row] of jobsTable.rows.entries()) {
    const companyId = pick(row, ["company_id", "企业ID", "企业编号"]);
    if (companyId && !companyIdSet.has(companyId) && !oldCompanyIds.has(companyId)) errors.push(`职位第 ${index + 2} 行关联了不存在的企业：${companyId}`);
  }

  const newCompanyCount = companiesTable.rows.filter((row, index) => companyIds[index] && !oldCompanyIds.has(companyIds[index]) && !oldCompanyNames.has(normalize(companyNames[index]))).length;
  const newJobCount = jobsTable.rows.filter((row, index) => jobKeys[index] && !oldJobKeys.has(jobKeys[index]) && !oldJobUrls.has(jobUrls[index])).length;
  const result = { version, inputDir, files: { companies: path.basename(companyFile), jobs: path.basename(jobFile) }, current: { companies: catalog.companies.length, jobs: catalog.jobs.length }, incoming: { companies: companiesTable.rows.length, jobs: jobsTable.rows.length }, new: { companies: newCompanyCount, jobs: newJobCount }, errors, warnings, generatedAt: new Date().toISOString() };
  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, `data-preflight-${version}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`\n数据导入预检查 ${version}\n${"=".repeat(36)}`);
  console.log(`企业：当前 ${result.current.companies}，收到 ${result.incoming.companies}，疑似新增 ${result.new.companies}`);
  console.log(`职位：当前 ${result.current.jobs}，收到 ${result.incoming.jobs}，疑似新增 ${result.new.jobs}`);
  console.log(`错误：${errors.length} 条；警告：${warnings.length} 条`);
  for (const message of warnings.slice(0, 80)) console.log(`⚠ ${message}`);
  for (const message of errors) console.error(`✖ ${message}`);
  console.log(`\n已生成 data/generated/data-preflight-${version}.json`);
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(`数据导入预检查失败：${error.message}`);
  process.exitCode = 1;
}



