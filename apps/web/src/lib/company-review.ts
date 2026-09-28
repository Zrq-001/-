import { readFile } from "node:fs/promises";
import path from "node:path";

export type CompanyReviewPriority = "high" | "medium" | "low";
export type CompanyReviewState = "missing_verification" | "missing_public_entry" | "overdue" | "due_soon" | "scheduled";
export type CompanyReviewMode = "automation_candidate" | "manual_first";

export type CompanyReviewRecord = {
  companyId: string;
  companyName: string;
  sourceTier: string;
  sourceLabel: string;
  isOfficial: boolean;
  currentStatus: string;
  verifiedAt: string | null;
  dueAt: string | null;
  daysUntilDue: number | null;
  priority: CompanyReviewPriority;
  state: CompanyReviewState;
  reviewMode: CompanyReviewMode;
  automationCandidate: boolean;
  careerUrl: string | null;
  evidenceUrl: string | null;
  checklist: string[];
  nextAction: string;
};

export type CompanyReviewQueue = {
  generatedFor: string;
  catalogVersion: string;
  city: string;
  note: string;
  summary: {
    totalCompanies: number;
    highPriority: number;
    dueSoon: number;
    scheduled: number;
    automationCandidates: number;
    manualFirst: number;
  };
  records: CompanyReviewRecord[];
};

export const emptyCompanyReviewQueue: CompanyReviewQueue = {
  generatedFor: "",
  catalogVersion: "",
  city: "成都",
  note: "",
  summary: { totalCompanies: 0, highPriority: 0, dueSoon: 0, scheduled: 0, automationCandidates: 0, manualFirst: 0 },
  records: [],
};

function isReviewQueue(value: unknown): value is CompanyReviewQueue {
  if (!value || typeof value !== "object") return false;
  const queue = value as Partial<CompanyReviewQueue>;
  return Array.isArray(queue.records) && typeof queue.generatedFor === "string" && Boolean(queue.summary);
}

/**
 * The queue is a locally generated planning report. This server-side reader
 * intentionally returns an empty state if the report does not exist or is
 * malformed rather than showing stale placeholders as operational truth.
 */
export async function getCompanyReviewQueue(): Promise<CompanyReviewQueue> {
  const filename = path.join(process.cwd(), "data", "generated", "review-queue.json");
  try {
    const parsed: unknown = JSON.parse(await readFile(filename, "utf8"));
    return isReviewQueue(parsed) ? parsed : emptyCompanyReviewQueue;
  } catch {
    return emptyCompanyReviewQueue;
  }
}
