/**
 * Convert the latest allowed source-scan reports into a small, explicit queue
 * for a human operator. This script never changes CSV files or website data.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adaptersPath = path.join(root, "data", "source-adapters.json");
const catalogPath = path.join(root, "src", "data", "catalog.json");
const scansRoot = path.join(root, "data", "generated", "source-scans");
const reviewRoot = path.join(root, "data", "generated", "source-reviews");
const outputPath = path.join(reviewRoot, "pending.json");
const templatePath = path.join(reviewRoot, "decisions.template.json");

function fail(message) {
  throw new Error(message);
}

function asArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} 必须是数组。`);
  return value;
}

function safeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function itemId(targetId, kind, value) {
  return `${targetId}:${kind}:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12)}`;
}

function assertTargetId(value) {
  if (!/^[a-z0-9-]+$/.test(value ?? "")) {
    fail(`来源目标 ID 只能包含小写字母、数字和连字符：${value}`);
  }
  return value;
}

async function readJsonIfPresent(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(filename, value) {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sourceHealthItem(target, company, scan) {
  const isBlocked = scan?.result === "blocked";
  const isFailed = scan?.result === "failed";
  const isMissing = !scan;
  const priority = isBlocked || isFailed || isMissing ? "high" : "medium";
  const state = isMissing ? "not_scanned" : scan.result;
  const reason = isMissing
    ? "尚未生成该来源的扫描报告。"
    : safeText(scan.reason) || "扫描结果需要人工判断。";

  return {
    id: itemId(target.id, "source-health", { state, scannedAt: scan?.scannedAt ?? null, reason }),
    kind: "source_health",
    priority,
    status: "pending",
    targetId: target.id,
    companyId: company.id,
    companyName: company.name,
    source: {
      portalUrl: target.portalUrl,
      allowedHosts: target.allowedHosts,
      mode: target.mode,
      sourceTier: company.sourceTier,
      isOfficial: company.isOfficial,
    },
    scan: scan
      ? {
          result: scan.result,
          scannedAt: scan.scannedAt,
          httpStatus: scan.httpStatus,
          reason,
        }
      : null,
    candidate: null,
    allowedDecisions: ["confirm_manual_followup", "pause_target", "defer"],
    recommendedAction: "人工打开官方入口，确认页面仍归属企业且可被求职者访问；必要时记录结构变更或暂停该适配器。",
    requiredEvidence: "填写同一官方招聘域名下、可公开访问的证据链接，并说明本次判断依据。",
  };
}

function candidateItem(target, company, kind, candidate, scan) {
  const definitions = {
    candidate_added: {
      priority: "medium",
      allowedDecisions: ["approve_for_data_entry", "reject_candidate", "defer"],
      recommendedAction: "人工打开职位详情，确认职位名称、地点、招聘类型和投递入口后，再手动新增 CSV 行。",
      requiredEvidence: "填写该职位的官方详情页链接；批准后仍需由数据维护流程修改 CSV。",
    },
    candidate_changed: {
      priority: "medium",
      allowedDecisions: ["approve_for_data_entry", "reject_candidate", "defer"],
      recommendedAction: "对比官方职位详情与当前 CSV；确认后手动更新相应字段，并保留验证日期。",
      requiredEvidence: "填写发生变化的官方职位详情页链接，并在备注中说明变化字段。",
    },
    candidate_not_observed: {
      priority: "low",
      allowedDecisions: ["confirm_manual_followup", "dismiss_candidate", "defer"],
      recommendedAction: "不要直接关闭岗位。请人工检查职位详情、列表筛选条件与页面结构，再决定是否标记为待核验或历史线索。",
      requiredEvidence: "填写复查过的官方列表页或职位详情页；不能确认时选择 defer。",
    },
  };
  const definition = definitions[kind];
  const sourceJobId = candidate.sourceJobId ?? candidate.after?.sourceJobId ?? candidate.before?.sourceJobId ?? null;

  return {
    id: itemId(target.id, kind, { sourceJobId, candidate }),
    kind,
    priority: definition.priority,
    status: "pending",
    targetId: target.id,
    companyId: company.id,
    companyName: company.name,
    source: {
      portalUrl: target.portalUrl,
      allowedHosts: target.allowedHosts,
      mode: target.mode,
      sourceTier: company.sourceTier,
      isOfficial: company.isOfficial,
    },
    scan: {
      result: scan.result,
      scannedAt: scan.scannedAt,
      httpStatus: scan.httpStatus,
      reason: safeText(scan.reason),
    },
    candidate,
    allowedDecisions: definition.allowedDecisions,
    recommendedAction: definition.recommendedAction,
    requiredEvidence: definition.requiredEvidence,
  };
}

const adapters = JSON.parse(await readFile(adaptersPath, "utf8"));
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const companies = asArray(catalog.companies, "catalog.json 的 companies");
const targets = asArray(adapters.targets, "source-adapters.json 的 targets").filter((target) => target.enabled);
const items = [];

for (const target of targets) {
  assertTargetId(target.id);
  const company = companies.find((entry) => entry.id === target.companyId);
  if (!company) fail(`${target.id} 对应企业不存在：${target.companyId}`);
  if (!company.isOfficial) fail(`${target.id} 对应企业不是官方来源，不能进入自动扫描复核队列。`);

  const latestPath = path.join(scansRoot, target.id, "latest.json");
  const scan = await readJsonIfPresent(latestPath);

  if (!scan || scan.result !== "success") {
    items.push(sourceHealthItem(target, company, scan));
    continue;
  }

  for (const job of scan.diff?.added ?? []) {
    items.push(candidateItem(target, company, "candidate_added", job, scan));
  }
  for (const change of scan.diff?.changed ?? []) {
    items.push(candidateItem(target, company, "candidate_changed", change, scan));
  }
  for (const job of scan.diff?.notObservedThisScan ?? []) {
    items.push(candidateItem(target, company, "candidate_not_observed", job, scan));
  }
}

const priorityOrder = { high: 0, medium: 1, low: 2 };
items.sort((left, right) => {
  const byPriority = priorityOrder[left.priority] - priorityOrder[right.priority];
  return byPriority || left.companyName.localeCompare(right.companyName, "zh-CN") || left.id.localeCompare(right.id);
});

await mkdir(reviewRoot, { recursive: true });
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  city: adapters.city ?? "",
  queueFingerprint: fingerprint(items),
  rules: [
    "该队列是人工审核任务，不会自动修改 CSV、catalog.json 或前台数据。",
    "任何候选岗位在得到官方公开证据和人工批准前，都不能作为新增职位发布。",
    "candidate_not_observed 仅表示本次扫描未观察到，不能直接等同于岗位关闭。",
  ],
  summary: {
    total: items.length,
    high: items.filter((item) => item.priority === "high").length,
    medium: items.filter((item) => item.priority === "medium").length,
    low: items.filter((item) => item.priority === "low").length,
  },
  items,
};

await writeJson(outputPath, output);
await writeJson(templatePath, {
  schemaVersion: 1,
  instructions: [
    "将本文件复制为 decisions.json 后再填写。不要直接修改 pending.json。",
    "每项必须选择该 item 的 allowedDecisions 之一；批准或确认跟进时必须填写同一官方招聘域名下的公开证据链接。",
    "该决定文件只产生动作预览，不会自动修改 CSV 或网站前台数据。",
  ],
  queueFingerprint: output.queueFingerprint,
  reviewer: "",
  decisions: items.map((item) => ({
    itemId: item.id,
    decision: "defer",
    evidenceUrl: "",
    notes: "请填写人工判断依据。",
    reviewedAt: "",
  })),
});
console.log("来源扫描人工复核队列");
console.log("=".repeat(36));
console.log(`待审核：${output.summary.total} 项（高 ${output.summary.high} / 中 ${output.summary.medium} / 低 ${output.summary.low}）`);
console.log(`待审核队列：${path.relative(root, outputPath).replaceAll("\\", "/")}`);
console.log(`决定模板：${path.relative(root, templatePath).replaceAll("\\", "/")}`);


