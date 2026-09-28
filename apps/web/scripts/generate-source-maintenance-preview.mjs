/**
 * Turn approved source-review decisions into a manual CSV-maintenance preview.
 *
 * This command is intentionally one-way and non-destructive:
 * - it reads approved-actions.json plus the reviewed CSV files;
 * - it writes only an ignored preview under data/generated/;
 * - it never edits CSV, catalog.json, source-adapters.json, or the public site.
 *
 * A preview makes the necessary human data-entry work explicit. It is not an
 * import file and must not be treated as an automatic publishing mechanism.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(root, "data", "generated", "source-reviews");
const sourceRoot = path.join(root, "data", "source");
const defaultActionsPath = path.join(reviewRoot, "approved-actions.json");
const defaultOutputPath = path.join(reviewRoot, "maintenance-preview.json");
const jobsCsvPath = path.join(sourceRoot, "成都职位样本_V1.3.csv");
const companiesCsvPath = path.join(sourceRoot, "成都企业池_V1.3.csv");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message) {
  throw new Error(message);
}

function safeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function asArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} 必须是数组。`);
  return value;
}

function asRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} 必须是对象。`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relative(filename) {
  return path.relative(root, filename).replaceAll("\\", "/");
}

function assertGeneratedOutput(filename) {
  const resolved = path.resolve(filename);
  const generatedRoot = `${path.resolve(reviewRoot)}${path.sep}`;
  if (!resolved.startsWith(generatedRoot)) {
    fail("维护预览只能写入 data/generated/source-reviews/，避免意外改动数据源。");
  }
  return resolved;
}

function parseCsv(source, filename) {
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

  if (quoted) fail(`${filename} 中存在未闭合的双引号。`);
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((values) => values.some((value) => safeText(value)));
}

async function readCsv(filename) {
  const source = (await readFile(filename, "utf8")).replace(/^\uFEFF/, "");
  const [headers, ...values] = parseCsv(source, relative(filename));
  if (!headers?.length) fail(`${relative(filename)} 缺少表头。`);

  return values.map((row, index) => {
    if (row.length !== headers.length) {
      fail(`${relative(filename)} 第 ${index + 2} 行有 ${row.length} 列，预期为 ${headers.length} 列。`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, row[column]]));
  });
}

function dateOnly(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "待人工填写" : parsed.toISOString().slice(0, 10);
}

function jobKey(companyId, sourceJobId) {
  return `${companyId}:${sourceJobId}`;
}

function candidateFrom(action) {
  const candidate = action.item?.candidate;
  return candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : null;
}

function isDirectCandidate(candidate) {
  return Boolean(safeText(candidate?.sourceJobId) && safeText(candidate?.title) && safeText(candidate?.detailUrl));
}

function jobRowProposal(action, company) {
  const candidate = candidateFrom(action);
  if (!candidate || !isDirectCandidate(candidate)) return null;

  const location = safeText(candidate.location);
  const recruitmentType = safeText(candidate.recruitmentType);
  const reviewedDate = dateOnly(action.reviewedAt);
  const sourceJobId = safeText(candidate.sourceJobId);

  return {
    job_key: jobKey(action.item.companyId, sourceJobId),
    company_id: action.item.companyId,
    序号: "需人工填写（保持该企业的职位排序）",
    公司名称: action.item.companyName,
    是否匹配企业池: "是",
    企业等级: safeText(company?.企业等级) || "需人工确认",
    所属行业: safeText(company?.所属行业) || "需人工确认",
    职位名称: safeText(candidate.title),
    工作地: location || "需人工确认",
    location_text: location || "需人工确认",
    province: "需人工确认",
    city: "需人工确认",
    district: "需人工确认",
    location_cities: location || "需人工确认",
    location_confidence: candidate.scopeMatched ? "confirmed（需人工复核）" : "needs_review",
    职能类别: "需人工补充",
    招聘类型: recruitmentType || "需人工确认",
    发布日期: "",
    url_type: "direct_detail",
    is_direct_detail: "是",
    detail_url_confidence: "medium（需人工打开官方详情页确认）",
    职位详情URL: safeText(candidate.detailUrl),
    来源招聘入口: safeText(action.evidenceUrl),
    是否官方来源: "是",
    official_source: "true",
    验证日期: reviewedDate,
    备注: `来源扫描人工审核：${safeText(action.notes)}`,
  };
}

function buildAddedPreview(action, jobByKey, companyById) {
  const candidate = candidateFrom(action);
  const sourceJobId = safeText(candidate?.sourceJobId);
  const key = sourceJobId ? jobKey(action.item.companyId, sourceJobId) : "";
  const current = key ? jobByKey.get(key) : null;
  const company = companyById.get(action.item.companyId);

  if (!candidate || !isDirectCandidate(candidate)) {
    return {
      itemId: action.itemId,
      kind: action.item.kind,
      decision: action.decision,
      disposition: "blocked_from_data_entry",
      reason: "候选岗位缺少来源岗位 ID、职位名称或官方详情链接，不能生成安全的数据录入预览。",
      nextStep: "回到官方公开页面人工确认完整岗位信息；不要补猜字段。",
    };
  }

  if (!candidate.scopeMatched) {
    return {
      itemId: action.itemId,
      kind: action.item.kind,
      decision: action.decision,
      disposition: "needs_location_confirmation",
      candidate: { sourceJobId, title: safeText(candidate.title), observedLocation: safeText(candidate.location) || null },
      reason: "扫描到的岗位没有明确匹配“成都”范围；不能将其作为成都岗位录入。",
      nextStep: "人工在官方详情页确认工作地后，再决定是否维护 CSV。",
    };
  }

  if (current) {
    return {
      itemId: action.itemId,
      kind: action.item.kind,
      decision: action.decision,
      disposition: "already_present",
      jobKey: key,
      currentCsvRow: { 职位名称: safeText(current.职位名称), 职位详情URL: safeText(current.职位详情URL), 验证日期: safeText(current.验证日期) },
      reason: "相同 job_key 已存在于职位样本 CSV；为避免重复记录，不生成新增行。",
      nextStep: "人工比对官方详情页与当前 CSV；如有变化，请按“岗位变化”流程维护。",
    };
  }

  return {
    itemId: action.itemId,
    kind: action.item.kind,
    decision: action.decision,
    disposition: "manual_csv_append_candidate",
    jobKey: key,
    evidenceUrl: action.evidenceUrl,
    reviewedAt: action.reviewedAt,
    reason: "已有人工作出“批准录入”决定；以下仅为待人工复核并填写的 CSV 行草案。",
    requiredHumanChecks: [
      "打开官方详情页，确认职位仍可访问、职位名称和工作地准确。",
      "补齐职能类别、省市区、序号及任何页面没有公开显示的字段；不要根据猜测填充。",
      "确认没有等价的现有职位记录后，才人工写入 data/source/成都职位样本_V1.3.csv。",
      "写入后运行 pnpm data:verify；通过后再运行 pnpm lint 和 pnpm build。",
    ],
    proposedCsvRow: jobRowProposal(action, company),
  };
}

function buildChangedPreview(action, jobByKey) {
  const change = candidateFrom(action);
  const before = asRecord(change?.before ?? {}, `${action.itemId} 的 before`);
  const after = asRecord(change?.after ?? {}, `${action.itemId} 的 after`);
  const sourceJobId = safeText(change?.sourceJobId || after.sourceJobId || before.sourceJobId);
  const key = sourceJobId ? jobKey(action.item.companyId, sourceJobId) : "";
  const current = key ? jobByKey.get(key) : null;

  return {
    itemId: action.itemId,
    kind: action.item.kind,
    decision: action.decision,
    disposition: current ? "manual_csv_compare" : "current_row_not_found",
    jobKey: key || null,
    evidenceUrl: action.evidenceUrl,
    observedBefore: { title: safeText(before.title) || null, location: safeText(before.location) || null, detailUrl: safeText(before.detailUrl) || null },
    observedAfter: { title: safeText(after.title) || null, location: safeText(after.location) || null, detailUrl: safeText(after.detailUrl) || null },
    currentCsvRow: current
      ? { 职位名称: safeText(current.职位名称), 工作地: safeText(current.工作地), 职位详情URL: safeText(current.职位详情URL), 验证日期: safeText(current.验证日期) }
      : null,
    reason: current
      ? "扫描器观察到来源字段变化；请人工以官方详情页为准，比对后手动更新必要字段。"
      : "扫描器观察到来源字段变化，但职位样本 CSV 没有同 job_key；不能自动新增或更新。",
    nextStep: current
      ? "人工核对官方页面后，按最小必要范围更新 CSV，并运行 pnpm data:verify。"
      : "确认该岗位是否应作为新增候选进入人工录入流程；不要把扫描变化直接写入 CSV。",
  };
}

function buildNonObservedPreview(action, jobByKey) {
  const candidate = candidateFrom(action);
  const sourceJobId = safeText(candidate?.sourceJobId);
  const key = sourceJobId ? jobKey(action.item.companyId, sourceJobId) : "";
  const current = key ? jobByKey.get(key) : null;

  return {
    itemId: action.itemId,
    kind: action.item.kind,
    decision: action.decision,
    disposition: "no_status_change",
    jobKey: key || null,
    currentCsvRow: current
      ? { 职位名称: safeText(current.职位名称), 职位详情URL: safeText(current.职位详情URL), 验证日期: safeText(current.验证日期) }
      : null,
    reason: "“本次未观察到”不等于岗位关闭，因此不会生成下线、删除或状态变更建议。",
    nextStep: "保留现有记录，安排人工在官方入口或详情页进行后续复核，并在审核备注中记录结果。",
  };
}

function buildSourceHealthPreview(action) {
  const isPause = action.decision === "pause_target";
  return {
    itemId: action.itemId,
    kind: action.item.kind,
    decision: action.decision,
    disposition: isPause ? "manual_adapter_config_review" : "no_csv_change",
    evidenceUrl: action.evidenceUrl,
    reason: isPause
      ? "人工决定暂停来源适配器；该决定不改变企业或职位数据。"
      : "来源健康结论只记录运营跟进，不直接改变企业或职位数据。",
    nextStep: isPause
      ? `人工复核后可将 data/source-adapters.json 内目标 ${safeText(action.item.targetId)} 的 enabled 设为 false，并保留原有来源记录；随后重新生成审核队列。`
      : "按审核说明安排下一次人工检查；不要把页面结构异常视为岗位关闭。",
  };
}

function buildPassivePreview(action) {
  return {
    itemId: action.itemId,
    kind: action.item.kind,
    decision: action.decision,
    disposition: "decision_record_only",
    evidenceUrl: action.evidenceUrl,
    reason: "该审核决定不允许产生数据写入候选。",
    nextStep: "保留审核决定、官方证据和说明，等待下一轮来源扫描或人工复核。",
  };
}

const actionsPath = path.resolve(root, argumentValue("--file") ?? defaultActionsPath);
const outputPath = assertGeneratedOutput(argumentValue("--output") ? path.resolve(root, argumentValue("--output")) : defaultOutputPath);
let actions;
try {
  actions = JSON.parse(await readFile(actionsPath, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") {
    fail(`未找到已校验审核结果：${relative(actionsPath)}。请先完成 pnpm source:review:check。`);
  }
  throw error;
}

const accepted = asArray(actions.accepted, "approved-actions.json 的 accepted");
if (!safeText(actions.reviewer)) fail("approved-actions.json 缺少 reviewer，不能生成维护预览。");

const [jobRows, companyRows, jobsRaw, companiesRaw] = await Promise.all([
  readCsv(jobsCsvPath),
  readCsv(companiesCsvPath),
  readFile(jobsCsvPath, "utf8"),
  readFile(companiesCsvPath, "utf8"),
]);
const jobByKey = new Map(jobRows.map((row) => [safeText(row.job_key), row]));
const companyById = new Map(companyRows.map((row) => [safeText(row.company_id), row]));
const items = [];

for (const action of accepted) {
  const checked = asRecord(action, "approved-actions.json 的 accepted 项");
  const item = asRecord(checked.item, `${safeText(checked.itemId) || "审核项"} 的 item`);
  if (!safeText(checked.itemId) || !safeText(checked.decision) || !safeText(item.kind)) {
    fail("approved-actions.json 中存在缺少 itemId、decision 或 item.kind 的审核项。");
  }

  const normalized = { ...checked, item };
  if (normalized.decision !== "approve_for_data_entry") {
    items.push(normalized.item.kind === "source_health" ? buildSourceHealthPreview(normalized) : buildPassivePreview(normalized));
  } else if (normalized.item.kind === "candidate_added") {
    items.push(buildAddedPreview(normalized, jobByKey, companyById));
  } else if (normalized.item.kind === "candidate_changed") {
    items.push(buildChangedPreview(normalized, jobByKey));
  } else if (normalized.item.kind === "candidate_not_observed") {
    items.push(buildNonObservedPreview(normalized, jobByKey));
  } else {
    items.push(buildPassivePreview(normalized));
  }
}

const count = (disposition) => items.filter((item) => item.disposition === disposition).length;
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewer: safeText(actions.reviewer),
  sourceReview: {
    reviewedAt: safeText(actions.reviewedAt),
    queueFingerprint: safeText(actions.queueFingerprint),
    decisionsFingerprint: safeText(actions.decisionsFingerprint),
    input: relative(actionsPath),
  },
  sourceSnapshot: {
    jobsCsv: { path: relative(jobsCsvPath), sha256: sha256(jobsRaw), records: jobRows.length },
    companiesCsv: { path: relative(companiesCsvPath), sha256: sha256(companiesRaw), records: companyRows.length },
  },
  safetyNotice: "这是人工维护预览，不是导入文件。它没有修改 CSV、catalog.json、来源适配配置或网站前台；任何职位下线均需独立的官方证据和人工判断。",
  requiredWorkflow: [
    "先确认本预览的 sourceSnapshot 指纹仍与当前 CSV 一致；如果 CSV 已变化，请重新生成预览。",
    "仅由人工在官方公开证据基础上修改 data/source/ 中的 CSV，绝不复制猜测字段。",
    "修改后运行 pnpm data:verify，再运行 pnpm lint 和 pnpm build。",
    "保留 approved-actions.json、maintenance-preview.json 和官方证据，形成可追溯记录。",
  ],
  summary: {
    reviewedActions: accepted.length,
    manualCsvAppendCandidates: count("manual_csv_append_candidate"),
    manualCsvCompareCandidates: count("manual_csv_compare"),
    alreadyPresent: count("already_present"),
    needsLocationConfirmation: count("needs_location_confirmation"),
    noStatusChange: count("no_status_change"),
    adapterConfigReviews: count("manual_adapter_config_review"),
    recordOnly: count("decision_record_only") + count("no_csv_change"),
  },
  items,
};

await mkdir(reviewRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log("来源审核维护预览");
console.log("=".repeat(36));
console.log(`审核决定：${accepted.length} 项`);
console.log(`CSV 新增候选：${output.summary.manualCsvAppendCandidates}；字段比对候选：${output.summary.manualCsvCompareCandidates}`);
console.log(`预览文件：${relative(outputPath)}`);
console.log("提示：预览不会写入 CSV。人工维护完成后请运行 pnpm data:verify。");

