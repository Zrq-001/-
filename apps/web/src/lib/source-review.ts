import { readFile } from "node:fs/promises";
import path from "node:path";

export type ReviewPriority = "high" | "medium" | "low";

export type SourceReviewItem = {
  id: string;
  kind: "source_health" | "candidate_added" | "candidate_changed" | "candidate_not_observed";
  priority: ReviewPriority;
  status: "pending";
  targetId: string;
  companyId: string;
  companyName: string;
  source: {
    portalUrl: string;
    allowedHosts: string[];
    mode: string;
    sourceTier: string;
    isOfficial: boolean;
  };
  scan: {
    result: string;
    scannedAt: string;
    httpStatus: number | null;
    reason: string;
  } | null;
  candidate: unknown;
  allowedDecisions: string[];
  recommendedAction: string;
  requiredEvidence: string;
};

export type SourceReviewQueue = {
  schemaVersion: number;
  generatedAt: string;
  city: string;
  queueFingerprint: string;
  rules: string[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  items: SourceReviewItem[];
};

export const emptySourceReviewQueue: SourceReviewQueue = {
  schemaVersion: 1,
  generatedAt: "",
  city: "成都",
  queueFingerprint: "",
  rules: [],
  summary: { total: 0, high: 0, medium: 0, low: 0 },
  items: [],
};

function isReviewQueue(value: unknown): value is SourceReviewQueue {
  if (!value || typeof value !== "object") return false;
  const queue = value as Partial<SourceReviewQueue>;
  return Array.isArray(queue.items) && typeof queue.queueFingerprint === "string" && Boolean(queue.summary);
}

/**
 * The review queue is generated locally by `pnpm source:review` and is ignored
 * by Git. This reader intentionally treats an absent or malformed report as an
 * empty desk rather than showing stale sample data as operational truth.
 */
export async function getSourceReviewQueue(): Promise<SourceReviewQueue> {
  const filename = path.join(process.cwd(), "data", "generated", "source-reviews", "pending.json");

  try {
    const parsed: unknown = JSON.parse(await readFile(filename, "utf8"));
    return isReviewQueue(parsed) ? parsed : emptySourceReviewQueue;
  } catch {
    return emptySourceReviewQueue;
  }
}
