/** Build the V1.6 CSV sources from the dated WorkBuddy audit bundle. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputDir = path.join(root, "data", "incoming", "AUTO_2026-10-09");
const sourceDir = path.join(root, "data", "source");
const generatedDir = path.join(root, "data", "generated");
const version = "V1.6";
const date = "2026-10-09";
const removedCompanyId = "CD0062"; // WorkBuddy marks this recruiting subsite as confirmed dead.
const excludedCompanyIds = new Set(["CD0440", "CD0438"]);
const manualReviewJobKeys = new Set();
const explicitThirdPartyJobKeys = new Set([
  "CD0403|深度学习算法工程师/机器视觉算法工程师|成都",
]);

function text(value) { return String(value ?? "").trim(); }
function parseCsv(source, filename) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (quoted) throw new Error(`${filename} 存在未闭合的双引号。`);
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const [headers, ...values] = rows.filter((cells) => cells.some((value) => text(value)));
  if (!headers?.length) throw new Error(`${filename} 缺少表头。`);
  return values.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`${filename} 第 ${index + 2} 行列数不一致。`);
    return Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
  });
}
async function readCsv(filename, directory) {
  return parseCsv((await readFile(path.join(directory, filename), "utf8")).replace(/^\uFEFF/, ""), filename);
}
function writeCsv(headers, rows) {
  const cell = (value) => {
    const valueText = String(value ?? "");
    return /[",\r\n]/.test(valueText) ? `"${valueText.replaceAll('"', '""')}"` : valueText;
  };
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => cell(row[header])).join(",")).join("\n")}\n`;
}
function numberOrBlank(value) {
  const normalized = text(value).replaceAll(",", "");
  return /^\d+$/.test(normalized) ? normalized : "";
}
function sourceTier(row) {
  if (row.source_type_code === "official_ats_third_party_hosted") return "official_ats";
  if (row.source_type_code === "group_unified_recruitment") return "group_career_site";
  if (row.source_type_code === "official_careers_page") return "official_company";
  return text(row.source_tier) || "unknown";
}
function validHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
function normalizedName(value) {
  return text(value).toLowerCase().replace(/[\s（）()【】\[\]，,。·.、&/＆_-]/g, "").replace(/(股份有限公司|有限责任公司|有限公司|集团股份|集团|股份|公司)$/g, "");
}
function hostname(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

const baseCompanies = await readCsv("成都企业池_V1.5.csv", sourceDir);
const baseJobs = await readCsv("成都职位样本_V1.5.csv", sourceDir);
const companyCandidates = await readCsv("01_新增企业候选.csv", inputDir);
const jobCandidates = await readCsv("02_新增职位候选.csv", inputDir);
const manualReviewRows = await readCsv("07_待人工复核清单.csv", inputDir);
const evidenceRows = await readCsv("10_来源证据索引.csv", inputDir);
if (baseCompanies.length !== 321 || baseJobs.length !== 601) throw new Error("V1.5 源数据基线不是 321 家 / 601 条，停止合并。");
for (const row of manualReviewRows) manualReviewJobKeys.add(text(row.job_key));

const keptBaseCompanies = baseCompanies.filter((row) => text(row.company_id) !== removedCompanyId);
const keptBaseJobs = baseJobs.filter((row) => text(row.company_id) !== removedCompanyId);
const oldIds = new Set(keptBaseCompanies.map((row) => text(row.company_id)));
const oldJobKeys = new Set(keptBaseJobs.map((row) => text(row.job_key)));
const oldNames = new Set(keptBaseCompanies.flatMap((row) => [row.公司名称, ...text(row.公司别名).split("|")]).map(normalizedName));
const oldDomains = new Set(keptBaseCompanies.map((row) => hostname(row.公司官网)).filter(Boolean));
const newCompanies = companyCandidates.filter((row) => !excludedCompanyIds.has(text(row.company_id)));
if (newCompanies.length !== 42) throw new Error(`预期新增 42 家企业，实际 ${newCompanies.length} 家。`);
for (const row of newCompanies) {
  const id = text(row.company_id);
  if (oldIds.has(id)) throw new Error(`企业 ID ${id} 已存在。`);
  if (oldNames.has(normalizedName(row.公司名称))) throw new Error(`企业名称疑似重复：${row.公司名称}`);
  if (oldDomains.has(hostname(row.企业官网))) throw new Error(`企业官网域名疑似重复：${row.公司名称} (${row.企业官网})`);
  if (text(row.入口实测状态码) !== "200" || !validHttpUrl(text(row.招聘入口URL))) throw new Error(`招聘入口未验证或 URL 无效：${id}`);
}
const newCompanyIds = new Set(newCompanies.map((row) => text(row.company_id)));

const jobGroups = new Map();
for (const row of jobCandidates) {
  const key = text(row.job_key);
  if (!jobGroups.has(key)) jobGroups.set(key, []);
  jobGroups.get(key).push(row);
}
const duplicateJobsRemoved = [];
const selectedJobs = [];
for (const [key, group] of jobGroups) {
  const eligible = group.filter((row) => !excludedCompanyIds.has(text(row.company_id)) && newCompanyIds.has(text(row.company_id)) && !oldJobKeys.has(key));
  if (!eligible.length) continue;
  eligible.sort((a, b) => Number(text(b.url_type) === "direct_detail") - Number(text(a.url_type) === "direct_detail"));
  selectedJobs.push(eligible[0]);
  for (const duplicate of eligible.slice(1)) duplicateJobsRemoved.push({ jobKey: key, keptUrlType: text(eligible[0].url_type), removedUrlType: text(duplicate.url_type), removedUrl: text(duplicate.职位详情URL) });
}
if (selectedJobs.length !== 125) throw new Error(`预期去重并排除无明确招聘入口的企业后新增 125 条职位，实际 ${selectedJobs.length} 条。`);
for (const row of selectedJobs) {
  if (!validHttpUrl(text(row.职位详情URL)) || !validHttpUrl(text(row.来源招聘入口))) throw new Error(`职位 URL 无效：${row.job_key}`);
}
const nonOfficialKeys = new Set([...manualReviewJobKeys, ...explicitThirdPartyJobKeys]);
const selectedJobRows = selectedJobs.map((row) => ({ ...row, isOfficial: !nonOfficialKeys.has(text(row.job_key)) }));
const publishedJobCounts = new Map();
const officialJobCounts = new Map();
for (const row of selectedJobRows) {
  const id = text(row.company_id);
  publishedJobCounts.set(id, (publishedJobCounts.get(id) || 0) + 1);
  if (row.isOfficial) officialJobCounts.set(id, (officialJobCounts.get(id) || 0) + 1);
}
const evidenceById = new Map(evidenceRows.map((row) => [text(row.company_id), row]));
const companyHeaders = Object.keys(baseCompanies[0]);
const jobHeaders = Object.keys(baseJobs[0]);

const addedCompanyRows = newCompanies.map((row, index) => {
  const id = text(row.company_id);
  const officialCount = officialJobCounts.get(id) || 0;
  const totalCount = publishedJobCounts.get(id) || 0;
  const pendingCount = [...manualReviewJobKeys].filter((key) => key.startsWith(`${id}|`)).length;
  const active = officialCount > 0;
  const evidence = evidenceById.get(id);
  const notes = [text(row.备注)];
  if (!active && totalCount) notes.push("本轮职位仅有第三方或待核验线索，未标记为企业官方职位；请以官方入口确认。");
  if (text(row.官网实测状态码) !== "200") notes.push("企业官网本次连接失败，但招聘入口可访问，建议下轮复测官网。");
  return {
    company_id: id, 序号: String(keptBaseCompanies.length + index + 1), 公司名称: text(row.公司名称), 公司别名: text(row.公司别名),
    企业等级: "", 公司官网: validHttpUrl(text(row.企业官网)) ? text(row.企业官网) : "", 官网已验证: text(row.官网已验证), 成都办公地点: text(row.成都办公地点),
    province: "四川省", city: "成都市", district: text(row.district), location_text: text(row.成都办公地点),
    location_confidence: text(row.成都办公地点) && !/未确认|未说明|未知/.test(text(row.成都办公地点)) ? "confirmed" : "not_available",
    所属行业: text(row.所属行业), "企业性质/规模": text(row["企业性质/规模"]), 企业简介: text(row.企业简介),
    企业来源渠道: text(evidence?.来源类型) || "企业官网", 招聘入口名称: text(row.招聘入口名称), 招聘入口URL: text(row.招聘入口URL),
    source_type_code: text(row.source_type_code), source_type_label: text(row.source_type_label), 招聘系统类型: text(row.招聘系统类型),
    source_tier: sourceTier(row), 是否官方来源: "是", official_source: "true", 来源可信度分级: text(row.来源可信度分级) || "A",
    含成都岗位: active ? "是" : "未知", "当前职位数量(页内可见)": active ? numberOrBlank(row["当前职位数量(页内可见)"]) : "",
    job_count_confidence: active ? "page_visible_count" : "unknown", 职位样本数: String(totalCount),
    status_code: active ? "active" : "needs_manual_review", status_label: active ? "有效（当前有可见职位）" : "需人工复核",
    招聘来源状态: active ? "有效（当前有可见职位）" : "需人工复核", page_status: active ? "公开招聘中" : "页面存在但职位线索未确认",
    verification_level: active ? "listing_count_observed" : "manual_review_required", verification_method: active ? "direct_page_visit" : "direct_page_visit|manual_review",
    record_category: active ? "official_active" : "manual_review", 官网实测状态码: text(row.官网实测状态码), 入口实测状态码: text(row.入口实测状态码),
    首次发现日期: text(row.首次发现日期) || date, 最后验证日期: text(row.最后验证日期) || date,
    证据链接: text(row.证据链接) || text(evidence?.来源URL), 职位复检结果: `${officialCount} 条官方样本${pendingCount ? `；${pendingCount} 条待核验线索` : ""}`,
    分级理由: text(row.分级理由), 备注: notes.filter(Boolean).join(" "), 是否为本轮新增: `是（${version}）`, 重复或关联提示: "",
  };
});

const addedJobSourceRows = selectedJobRows.map((row) => {
  const id = text(row.company_id);
  const company = newCompanies.find((item) => text(item.company_id) === id);
  const direct = text(row.url_type) === "direct_detail";
  const official = row.isOfficial;
  const location = text(row.工作地) || "成都";
  const notes = [text(row.备注)];
  if (!official) notes.push("非官方/待核验线索；职位信息及在招状态请以企业官方页面为准。");
  return {
    job_key: text(row.job_key), company_id: id, 序号: text(row.序号), 公司名称: text(row.公司名称), 是否匹配企业池: "是", 企业等级: "",
    所属行业: text(row.所属行业) || text(company.所属行业), 职位名称: text(row.职位名称), 工作地: location, location_text: location,
    province: "四川省", city: "成都市", district: text(row.district), location_cities: "成都", location_confidence: "confirmed",
    职能类别: text(row.职能类别), 招聘类型: text(row.招聘类型), 发布日期: "", 薪资信息: text(row.薪资信息), 经验要求: text(row.经验要求), 学历要求: text(row.学历要求),
    招聘人数: numberOrBlank(row.招聘人数), 招聘人数原文: text(row.招聘人数), 职位描述: text(row.职位描述), 任职要求: text(row.任职要求), 福利信息: text(row.福利信息),
    url_type: text(row.url_type), is_direct_detail: direct ? "是" : "否", detail_url_confidence: direct ? "high" : "low",
    职位详情URL: text(row.职位详情URL), 来源招聘入口: text(row.来源招聘入口), 是否官方来源: official ? "是" : "否（非官方线索）",
    official_source: official ? "true" : "false", 来源_channel: `WorkBuddy ${version}`, 首次发现日期: text(row.验证日期) || date,
    最近核验日期: text(row.验证日期) || date, 页面当前状态: text(row.页面当前状态), 是否能确认仍在招聘: text(row.是否能确认仍在招聘),
    验证日期: text(row.验证日期) || date, 备注: notes.filter(Boolean).join(" "), 来源可信度: text(row.来源可信度),
  };
});

const sourceCompanies = [...keptBaseCompanies, ...addedCompanyRows];
const sourceJobs = [...keptBaseJobs, ...addedJobSourceRows];
if (new Set(sourceCompanies.map((row) => text(row.company_id))).size !== sourceCompanies.length) throw new Error("企业 ID 重复。");
if (new Set(sourceJobs.map((row) => text(row.job_key))).size !== sourceJobs.length) throw new Error("职位 key 重复。");
const allCompanyIds = new Set(sourceCompanies.map((row) => text(row.company_id)));
if (sourceJobs.some((row) => !allCompanyIds.has(text(row.company_id)))) throw new Error("发现企业池中不存在的职位关联。");
if (sourceCompanies.length !== 362 || sourceJobs.length !== 726) throw new Error(`最终数量不符：企业 ${sourceCompanies.length}，职位 ${sourceJobs.length}。`);

await writeFile(path.join(sourceDir, `成都企业池_${version}.csv`), writeCsv(companyHeaders, sourceCompanies), "utf8");
await writeFile(path.join(sourceDir, `成都职位样本_${version}.csv`), writeCsv(jobHeaders, sourceJobs), "utf8");
await mkdir(generatedDir, { recursive: true });
const summary = {
  version, verifiedAt: date,
  baseline: { version: "V1.5", companies: 321, jobs: 601 },
  result: { companies: sourceCompanies.length, jobs: sourceJobs.length, addedCompanies: addedCompanyRows.length, addedJobs: addedJobSourceRows.length, addedOfficialJobs: addedJobSourceRows.filter((row) => row.official_source === "true").length, addedThirdPartyLeads: addedJobSourceRows.filter((row) => row.official_source === "false").length, directJobs: sourceJobs.filter((row) => row.is_direct_detail === "是").length },
  changes: { removedCompany: removedCompanyId, excludedCompanies: [...excludedCompanyIds], excludedCompanyJobs: jobCandidates.filter((row) => excludedCompanyIds.has(text(row.company_id))).length, manualReviewLeadsMarkedNonOfficial: manualReviewJobKeys.size, duplicateJobsRemoved },
};
await writeFile(path.join(generatedDir, "v16-release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`V1.6 源数据已生成：${sourceCompanies.length} 家企业、${sourceJobs.length} 条职位；新增 ${addedCompanyRows.length} 家企业、${addedJobSourceRows.length} 条职位（${summary.result.addedOfficialJobs} 官方、${summary.result.addedThirdPartyLeads} 第三方线索）。`);