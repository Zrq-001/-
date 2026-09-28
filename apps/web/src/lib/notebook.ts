export type NotebookEntry = {
  itemId: string;
  kind: "company" | "job";
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  isOfficial: boolean;
};

export type NotebookStatus = "later" | "to_apply" | "applied";

export type NotebookMeta = {
  status: NotebookStatus;
  note: string;
  updatedAt: string;
};

export type RecentView = {
  itemId: string;
  viewedAt: string;
};

export const SAVED_ITEMS_KEY = "rong-xiao-zhao-saved";
export const NOTEBOOK_META_KEY = "rong-xiao-zhao-notebook";
export const RECENT_VIEWS_KEY = "rong-xiao-zhao-recent";
export const NOTEBOOK_CHANGE_EVENT = "rong-xiao-zhao:notebook-change";
