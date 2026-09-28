/**
 * Validate a human decision file against the current source review queue.
 * It produces an audit-friendly action preview only; it never edits CSV data.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(root, "data", "generated", "source-reviews");
const queuePath = path.join(reviewRoot, "pending.json");
const defaultDecisionsPath = path.join(reviewRoot, "decisions.json");
const outputPath = path.join(reviewRoot, "approved-actions.json");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

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

function validateHttpsOfficialUrl(value, allowedHosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} 不是有效 URL。`);
  }
  if (url.protocol !== "https:") fail(`${label} 必须使用 https。`);
  if (!allowedHosts.includes(url.hostname)) {
    fail(`${label} 的域名 ${url.hostname} 不属于该来源的允许官方域名。`);
  }
  return url.toString();
}

function proposedAction(item, decision) {
  if (decision.decision === "approve_for_data_entry") {
    return "已批准为人工数据录入候选：请在确认的官方证据基础上手动维护 CSV，随后运行 pnpm data:verify。";
  }
  if (decision.decision === "confirm_manual_followup") {
    return "已确认需要人工跟进：不要自动改变岗位或来源状态；按备注完成下一次复核。";
  }
  if (decision.decision === "pause_target") {
    return "建议人工将该来源适配器设为 disabled，并保留原有企业来源记录供后续复核。";
  }
  return "不产生数据写入动作；保留本次人工决定与证据。";
}

const decisionsPath = path.resolve(root, argumentValue("--file") ?? defaultDecisionsPath);
const queue = JSON.parse(await readFile(queuePath, "utf8"));
let decisions;
try {
  decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") {
    fail(`未找到审核决定文件：${path.relative(root, decisionsPath)}。请先复制 data/generated/source-reviews/decisions.template.json 为 decisions.json 并填写。`);
  }
  throw error;
}
const queueItems = asArray(queue.items, "pending.json 的 items");
const submitted = asArray(decisions.decisions, "decisions.json 的 decisions");

if (!safeText(decisions.reviewer)) fail("decisions.json 必须填写 reviewer。");
if (decisions.queueFingerprint !== queue.queueFingerprint) {
  fail("审核决定对应的队列版本已过期。请重新运行 pnpm source:review，再基于新的 queueFingerprint 审核。");
}

const queueById = new Map(queueItems.map((item) => [item.id, item]));
const seen = new Set();
const accepted = [];

for (const decision of submitted) {
  const id = safeText(decision.itemId);
  if (!id) fail("每条审核决定都必须填写 itemId。");
  if (seen.has(id)) fail(`审核决定中存在重复 itemId：${id}`);
  seen.add(id);

  const item = queueById.get(id);
  if (!item) fail(`审核决定引用了当前队列中不存在的 itemId：${id}`);
  if (!item.allowedDecisions.includes(decision.decision)) {
    fail(`${id} 不允许使用决定：${decision.decision}`);
  }

  const notes = safeText(decision.notes);
  if (notes.length < 8) fail(`${id} 的 notes 至少需要 8 个字符，说明人工判断依据。`);
  const needsEvidence = ["approve_for_data_entry", "confirm_manual_followup"].includes(decision.decision);
  const evidenceUrl = needsEvidence
    ? validateHttpsOfficialUrl(decision.evidenceUrl, item.source.allowedHosts, `${id} 的 evidenceUrl`)
    : safeText(decision.evidenceUrl) || null;

  accepted.push({
    itemId: id,
    decision: decision.decision,
    evidenceUrl,
    notes,
    reviewedAt: safeText(decision.reviewedAt) || new Date().toISOString(),
    item: {
      kind: item.kind,
      targetId: item.targetId,
      companyId: item.companyId,
      companyName: item.companyName,
      candidate: item.candidate,
    },
    proposedAction: proposedAction(item, decision),
  });
}

await mkdir(reviewRoot, { recursive: true });
const output = {
  schemaVersion: 1,
  reviewedAt: new Date().toISOString(),
  reviewer: safeText(decisions.reviewer),
  queueFingerprint: queue.queueFingerprint,
  decisionsFingerprint: fingerprint(accepted),
  safetyNotice: "本文件只是经校验的人工决定与后续动作预览。它没有修改 CSV、catalog.json 或网站前台数据。",
  accepted,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log("来源扫描审核决定校验");
console.log("=".repeat(36));
console.log(`审核人：${output.reviewer}`);
console.log(`有效决定：${accepted.length} 项`);
console.log(`动作预览：${path.relative(root, outputPath).replaceAll("\\", "/")}`);


