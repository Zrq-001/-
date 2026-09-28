/**
 * Build a company-level recheck queue from the reviewed catalog.
 * This is planning data, not a crawler: "automation_candidate" means a source
 * can be evaluated for a future adapter, not that it is already auto-checked.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "src", "data", "catalog.json");
const policyPath = path.join(root, "data", "review-policy.json");
const outputDirectory = path.join(root, "data", "generated");
const outputPath = path.join(outputDirectory, "review-queue.json");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    throw new Error(`${label} 必须是 YYYY-MM-DD，收到：${value || "空"}`);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} 不是有效日期：${value}`);
  return date;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayDistance(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function queueState({ company, policy, asOf }) {
  if (!company.verifiedAt) return { priority: "high", state: "missing_verification" };
  if (company.isOfficial && company.status === "active" && !company.careerUrl) {
    return { priority: "high", state: "missing_public_entry" };
  }

  const dueAt = addDays(parseDate(company.verifiedAt, `${company.id} 的最后验证日期`), policy.cadenceDays);
  const daysUntilDue = dayDistance(asOf, dueAt);

  if (daysUntilDue < 0) return { priority: "high", state: "overdue", dueAt, daysUntilDue };
  if (daysUntilDue <= 3) return { priority: "medium", state: "due_soon", dueAt, daysUntilDue };
  return { priority: "low", state: "scheduled", dueAt, daysUntilDue };
}

function nextAction(company, queueItem) {
  if (queueItem.state === "missing_public_entry") {
    return "补充可公开访问的官方招聘链接；如入口只能在微信内打开，保留明确人工投递说明并继续标注来源类型。";
  }
  if (queueItem.state === "missing_verification") {
    return "完成首次人工复核，补充验证日期、证据链接和来源判断。";
  }
  if (queueItem.state === "overdue") return "按该来源类型的复核清单复查，并更新验证日期。";
  if (queueItem.state === "due_soon") return "安排近期复核，优先检查职位状态和投递入口。";
  return "按计划复核；若有新线索或用户反馈，可提前复查。";
}

const asOfText = argumentValue("--as-of") ?? new Date().toISOString().slice(0, 10);
const asOf = parseDate(asOfText, "--as-of");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const reviewPolicy = JSON.parse(await readFile(policyPath, "utf8"));

if (!Array.isArray(catalog.companies)) throw new Error("catalog.json 缺少 companies 数组。");
if (!reviewPolicy.default || !reviewPolicy.tiers) throw new Error("review-policy.json 缺少 default 或 tiers。");

const records = catalog.companies
  .map((company) => {
    const policy = reviewPolicy.tiers[company.sourceTier] ?? reviewPolicy.default;
    const timing = queueState({ company, policy, asOf });
    const dueAt = timing.dueAt ?? (company.verifiedAt ? addDays(parseDate(company.verifiedAt, `${company.id} 的最后验证日期`), policy.cadenceDays) : null);

    return {
      companyId: company.id,
      companyName: company.name,
      sourceTier: company.sourceTier || "unknown",
      sourceLabel: company.sourceType || company.careerSourceName || "来源待补充",
      isOfficial: company.isOfficial,
      currentStatus: company.status,
      verifiedAt: company.verifiedAt || null,
      dueAt: dueAt ? toDateString(dueAt) : null,
      daysUntilDue: timing.daysUntilDue ?? null,
      priority: timing.priority,
      state: timing.state,
      reviewMode: policy.reviewMode,
      automationCandidate: policy.automationCandidate,
      careerUrl: company.careerUrl || null,
      evidenceUrl: company.evidenceUrl || null,
      checklist: policy.checklist,
      nextAction: nextAction(company, timing),
    };
  })
  .sort((left, right) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDifference = priorityOrder[left.priority] - priorityOrder[right.priority];
    if (priorityDifference !== 0) return priorityDifference;
    return (left.daysUntilDue ?? -99_999) - (right.daysUntilDue ?? -99_999);
  });

const count = (predicate) => records.filter(predicate).length;
const report = {
  generatedFor: asOfText,
  catalogVersion: catalog.meta?.version ?? "unknown",
  city: catalog.meta?.city ?? reviewPolicy.city ?? "",
  note: "这是复核排期，不代表网站已经自动抓取或自动确认任何职位状态。",
  summary: {
    totalCompanies: records.length,
    highPriority: count((record) => record.priority === "high"),
    dueSoon: count((record) => record.state === "due_soon"),
    scheduled: count((record) => record.state === "scheduled"),
    automationCandidates: count((record) => record.automationCandidate),
    manualFirst: count((record) => !record.automationCandidate),
  },
  records,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("\n招聘来源复核队列");
console.log("=".repeat(36));
console.log(`排期日期：${report.generatedFor}`);
console.log(`企业总数：${report.summary.totalCompanies}`);
console.log(`高优先级：${report.summary.highPriority}`);
console.log(`即将到期：${report.summary.dueSoon}`);
console.log(`可评估自动适配：${report.summary.automationCandidates}`);
console.log(`默认人工复核：${report.summary.manualFirst}`);
console.log(`已写入：${path.relative(root, outputPath)}`);
