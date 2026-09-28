/**
 * Low-frequency scanner for a configured public official recruitment page.
 *
 * This is deliberately a review aid, not an auto-publisher:
 * - one configured GET request only;
 * - no login, pagination, API guessing, CAPTCHA bypass, or form submission;
 * - never writes back to the CSV/catalog;
 * - a missing job is recorded as "not observed this scan", never "closed".
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adaptersPath = path.join(root, "data", "source-adapters.json");
const catalogPath = path.join(root, "src", "data", "catalog.json");
const scanRoot = path.join(root, "data", "generated", "source-scans");
const scannerVersion = "0.1.0";
const userAgent = "RongXiaoZhaoSourceScanner/0.1 (public-source review; no login or form submission)";
const timeoutMs = 15_000;
const maxResponseCharacters = 3_000_000;

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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function utcFileStamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ");
  }
}

function visibleText(html) {
  return safeText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
  );
}

function assertAllowedUrl(value, allowedHosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} 不是有效 URL：${value}`);
  }

  if (url.protocol !== "https:") fail(`${label} 必须使用 https：${value}`);
  if (url.username || url.password) fail(`${label} 不允许包含账号信息。`);
  if (!allowedHosts.includes(url.hostname)) {
    fail(`${label} 的主机 ${url.hostname} 不在 allowedHosts 中。`);
  }
  return url;
}

function pageLooksBlocked(text) {
  const patterns = [
    /请(?:完成|进行).{0,12}(?:人机)?验证/,
    /人机验证/,
    /安全验证/,
    /访问(?:过于频繁|受限|被拒绝)/,
    /请求(?:过于频繁|异常)/,
    /登录后(?:查看|投递|访问)/,
    /需要登录(?:后)?(?:查看|投递|访问)?/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function firstFieldValue(source, fieldNames) {
  const escaped = fieldNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = new RegExp(`"(?:${escaped})"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i").exec(source);
  return match ? safeText(decodeJsonString(match[1])) : "";
}

/**
 * Extract only explicit, structured position objects from serialized page data.
 * It intentionally does not infer titles from prose or use hidden APIs. If the
 * page changes shape, returning no jobs moves the source to human review.
 */
function extractBytedanceJobs(html, target) {
  const jobs = new Map();
  const idExpression = /"(?:positionId|position_id)"\s*:\s*"?(\d{10,})"?/gi;
  let match;

  while ((match = idExpression.exec(html)) !== null) {
    const sourceJobId = match[1];
    const start = Math.max(0, match.index - 2_500);
    const end = Math.min(html.length, match.index + 2_500);
    const window = html.slice(start, end);
    const title = firstFieldValue(window, ["positionName", "position_name", "positionTitle", "jobTitle"]);
    if (!title) continue;

    const location = firstFieldValue(window, ["locationName", "location", "cityName", "city", "workLocation"]);
    const recruitmentType = firstFieldValue(window, ["recruitmentType", "recruitType", "jobCategory", "jobType"]);
    const detailUrl = target.detailUrlTemplate.replace("{id}", sourceJobId);
    assertAllowedUrl(detailUrl, target.allowedHosts, `${target.id} 的职位详情 URL`);

    jobs.set(sourceJobId, {
      sourceJobId,
      title,
      location: location || null,
      recruitmentType: recruitmentType || null,
      detailUrl,
      scopeMatched: Boolean(location && location.includes(target.scope)),
    });
  }

  return [...jobs.values()].sort((left, right) => left.sourceJobId.localeCompare(right.sourceJobId));
}

function jobFingerprint(job) {
  return JSON.stringify({
    title: job.title,
    location: job.location,
    recruitmentType: job.recruitmentType,
    detailUrl: job.detailUrl,
  });
}

function calculateDiff(previousJobs, currentJobs) {
  const previous = new Map((previousJobs ?? []).map((job) => [job.sourceJobId, job]));
  const current = new Map((currentJobs ?? []).map((job) => [job.sourceJobId, job]));
  const added = [];
  const notObservedThisScan = [];
  const changed = [];

  for (const [id, job] of current) {
    const before = previous.get(id);
    if (!before) {
      added.push(job);
      continue;
    }
    if (jobFingerprint(before) !== jobFingerprint(job)) {
      changed.push({ sourceJobId: id, before, after: job });
    }
  }

  for (const [id, job] of previous) {
    if (!current.has(id)) notObservedThisScan.push(job);
  }

  return { added, notObservedThisScan, changed };
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

function reportSummary(report) {
  const jobs = report.jobs?.length ?? 0;
  const added = report.diff?.added?.length ?? 0;
  const unseen = report.diff?.notObservedThisScan?.length ?? 0;
  const changed = report.diff?.changed?.length ?? 0;
  console.log(`来源扫描：${report.targetId}`);
  console.log(`结果：${report.result}${report.httpStatus ? ` (HTTP ${report.httpStatus})` : ""}`);
  console.log(`结构化岗位：${jobs}；新增候选：${added}；本次未观察到：${unseen}；变化候选：${changed}`);
  console.log(`复核：${report.requiresHumanReview ? "需要人工确认" : "不适用"}`);
  if (report.reason) console.log(`说明：${report.reason}`);
  console.log(`报告：${report.outputPath}`);
}

const targetId = argumentValue("--target") ?? "bytedance-campus-chengdu";
const adapters = JSON.parse(await readFile(adaptersPath, "utf8"));
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const target = asArray(adapters.targets, "source-adapters.json 的 targets").find((item) => item.id === targetId);
if (!target) fail(`未找到来源适配配置：${targetId}`);
if (!target.enabled) fail(`${targetId} 当前已禁用。`);
if (target.requestLimit !== 1) fail(`${targetId} 只能配置 requestLimit: 1，避免扩展为高频抓取。`);

const allowedHosts = asArray(target.allowedHosts, `${targetId}.allowedHosts`);
const portalUrl = assertAllowedUrl(target.portalUrl, allowedHosts, `${targetId} 的 portalUrl`);
assertAllowedUrl(target.detailUrlTemplate.replace("{id}", "0000000000"), allowedHosts, `${targetId} 的 detailUrlTemplate`);

const company = asArray(catalog.companies, "catalog.json 的 companies").find((item) => item.id === target.companyId);
if (!company) fail(`catalog.json 中不存在企业：${target.companyId}`);
if (!company.isOfficial) fail(`${target.companyId} 不是官方来源，禁止运行自动扫描。`);
if (!company.careerUrl) fail(`${target.companyId} 没有公开招聘入口，禁止运行自动扫描。`);
assertAllowedUrl(company.careerUrl, allowedHosts, `${target.companyId} 的 careerUrl`);

const targetDirectory = path.join(scanRoot, target.id);
const runsDirectory = path.join(targetDirectory, "runs");
const latestPath = path.join(targetDirectory, "latest.json");
const lastSuccessPath = path.join(targetDirectory, "last-success.json");
await mkdir(runsDirectory, { recursive: true });

const scannedAt = new Date();
const report = {
  schemaVersion: 1,
  scannerVersion,
  targetId: target.id,
  companyId: target.companyId,
  adapter: target.adapter,
  scannedAt: scannedAt.toISOString(),
  sourceUrl: portalUrl.toString(),
  scope: target.scope,
  mode: target.mode,
  requestLimit: target.requestLimit,
  result: "failed",
  httpStatus: null,
  jobs: [],
  fingerprint: null,
  diff: { added: [], notObservedThisScan: [], changed: [] },
  requiresHumanReview: true,
  reason: null,
};

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(portalUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "User-Agent": userAgent,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  report.httpStatus = response.status;
  if (response.status >= 300 && response.status < 400) {
    report.result = "manual_review_needed";
    report.reason = "公开入口返回重定向。为避免跟随未验证目标，本次未继续访问；请人工确认跳转地址。";
  } else if ([401, 403, 407, 429].includes(response.status)) {
    report.result = "blocked";
    report.reason = `公开入口返回 HTTP ${response.status}。未尝试登录、重试或绕过访问限制。`;
  } else if (!response.ok) {
    report.result = "failed";
    report.reason = `公开入口返回 HTTP ${response.status}。`;
  } else if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) {
    report.result = "manual_review_needed";
    report.reason = "公开入口未返回预期 HTML 页面；未尝试猜测或调用其他接口。";
  } else {
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxResponseCharacters) {
      report.result = "manual_review_needed";
      report.reason = "页面响应超过本扫描器的安全大小限制；请人工检查页面结构。";
    } else {
      const html = await response.text();
      if (html.length > maxResponseCharacters) {
        report.result = "manual_review_needed";
        report.reason = "页面响应超过本扫描器的安全大小限制；请人工检查页面结构。";
      } else {
        const text = visibleText(html);
        const expectedText = asArray(target.expectedPageText, `${target.id}.expectedPageText`);
        if (!expectedText.every((item) => text.includes(item))) {
          report.result = "manual_review_needed";
          report.reason = "页面没有出现配置中的官方招聘标识；为避免误判，未解析职位。";
        } else if (pageLooksBlocked(text)) {
          report.result = "blocked";
          report.reason = "页面出现登录、访问限制或人机验证提示；未尝试绕过。";
        } else {
          const jobs = extractBytedanceJobs(html, target);
          if (jobs.length === 0) {
            report.result = "manual_review_needed";
            report.reason = "页面可以读取，但没有提取到明确的结构化岗位。可能是页面结构变化或动态渲染，需要人工确认。";
          } else {
            const previousSuccess = await readJsonIfPresent(lastSuccessPath);
            report.jobs = jobs;
            report.fingerprint = sha256(JSON.stringify(jobs));
            report.diff = calculateDiff(previousSuccess?.jobs, jobs);
            report.result = "success";
            report.reason = "仅生成候选变化，所有新增、变化和未观察到岗位均需人工复核后才能写入数据源。";
            report.previousSuccessfulScanAt = previousSuccess?.scannedAt ?? null;
          }
        }
      }
    }
  }
} catch (error) {
  report.result = "failed";
  report.reason = error?.name === "AbortError" ? `请求超过 ${timeoutMs / 1000} 秒超时限制。` : `扫描请求失败：${safeText(error?.message)}`;
}

const runPath = path.join(runsDirectory, `${utcFileStamp(scannedAt)}.json`);
report.outputPath = path.relative(root, latestPath).replaceAll("\\", "/");
await writeJson(runPath, report);
await writeJson(latestPath, report);
if (report.result === "success") await writeJson(lastSuccessPath, report);
reportSummary(report);

if (report.result === "failed") process.exitCode = 1;
