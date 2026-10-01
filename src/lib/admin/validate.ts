// route 收到的東西全部經過這裡。呼叫端是已驗證的管理員，但「已驗證」不等於
// 「送來的一定是合法的」——瀏覽器可能帶著半填的表單、舊分頁、或是被改過的
// 請求。資料庫那一批對每個壞輸入都有明確的錯誤，但在這裡擋掉可以省一次
// 往返，也讓錯誤訊息是給人看的。
//
// 這裡刻意沒有 `server-only`：它一個機密都不碰，而那個標記會讓它連測試都
// 跑不起來。守著 service_role key 的是 server.ts，標記在那裡。

import { isTargetKind, TARGET_KINDS, type TargetKind } from "./targetKind";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BadInput extends Error {}

export function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new BadInput(`${field} must be a uuid`);
  }
  return value.toLowerCase();
}

/** 原樣送進 rpc 的 p_kind。清單在 targetKind.ts，跟 social.target_kind 對齊。 */
export function targetKind(value: unknown): TargetKind {
  if (!isTargetKind(value)) {
    throw new BadInput(`kind must be one of ${TARGET_KINDS.join(", ")}`);
  }
  return value;
}

export function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new BadInput(`${field} must be true or false`);
  return value;
}

/** 理由是要留給未來的自己看的，所以有長度上限也有下限。 */
export function reason(value: unknown, { required }: { required: boolean }): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new BadInput("a reason is required");
    return null;
  }
  if (typeof value !== "string") throw new BadInput("reason must be text");
  const trimmed = value.trim();
  if (required && trimmed === "") throw new BadInput("a reason is required");
  if (trimmed.length > 500) throw new BadInput("reason is too long (500 max)");
  return trimmed === "" ? null : trimmed;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new BadInput(`${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

/** null = 永久封禁,那是刻意的選項而不是漏填。 */
export function optionalTimestamp(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new BadInput(`${field} must be a date`);
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new BadInput(`${field} is not a valid date`);
  if (ms <= Date.now()) throw new BadInput(`${field} must be in the future`);
  return new Date(ms).toISOString();
}

export function pageParams(url: URL): { limit: number; offset: number } {
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  return {
    limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
  };
}

/** 檢舉佇列的讀取篩選。'all' 另外處理：它是「不篩」，送給 rpc 的是 null。 */
export const REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;

/**
 * 佇列的排序，跟 admin_report_queue 的 p_sort 一一對應。
 *   most：未處理檢舉最多的在前（原本的順序）
 *   newest：最近被檢舉的在前
 *   oldest：在這個狀態下等最久的在前
 */
export const REPORT_SORTS = ["most", "newest", "oldest"] as const;
export type ReportSort = (typeof REPORT_SORTS)[number];

/** 沒帶就是原本的「檢舉最多」。帶了但認不得是 400，不是默默退回預設。 */
export function reportSort(value: string | null): ReportSort {
  if (value === null || value === "") return "most";
  return oneOf(value, REPORT_SORTS, "sort");
}

/**
 * 佇列要看哪幾種目標，逗號分隔。沒帶或空字串 = 全部，回 null（rpc 那邊就
 * 不帶 p_kinds）。重複的只留一個，順序照 TARGET_KINDS。
 *
 * 空的一格或認不得的種類是 400，不是略過：略過一個打錯的種類，畫面上看到的
 * 會是「這種沒有檢舉」，而那不是真的。
 */
export function targetKinds(value: string | null): TargetKind[] | null {
  if (value === null || value === "") return null;
  const wanted = new Set<string>(value.split(","));
  for (const kind of wanted) {
    if (!isTargetKind(kind)) {
      throw new BadInput(`kinds must be a comma-separated list of ${TARGET_KINDS.join(", ")}`);
    }
  }
  return TARGET_KINDS.filter((kind) => wanted.has(kind));
}

/**
 * GET /api/admin/reports 的查詢參數 → admin_report_queue 的參數（少了
 * p_admin_id，那個由 withAdmin 給）。抽出來是為了測得到：route 檔只能
 * export Next 認得的名字。
 */
export function reportQueueParams(url: URL): {
  p_status: (typeof REPORT_STATUSES)[number] | null;
  p_sort: ReportSort;
  p_kinds?: TargetKind[];
  p_limit: number;
  p_offset: number;
} {
  const { limit, offset } = pageParams(url);
  const status = url.searchParams.get("status") ?? "open";
  if (status !== "all" && !(REPORT_STATUSES as readonly string[]).includes(status)) {
    throw new BadInput("unknown status");
  }
  const kinds = targetKinds(url.searchParams.get("kinds"));
  return {
    p_status: status === "all" ? null : (status as (typeof REPORT_STATUSES)[number]),
    p_sort: reportSort(url.searchParams.get("sort")),
    // 全部 = 不帶，交給 rpc 的預設值。
    ...(kinds ? { p_kinds: kinds } : {}),
    p_limit: limit,
    p_offset: offset,
  };
}

/** 藍勾勾佇列的讀取篩選。'all' 另外處理：它是「不篩」，送給 rpc 的是 null。 */
export const BADGE_STATUSES = ["pending", "approved", "rejected"] as const;

/**
 * 藍勾勾佇列的排序，跟 admin_badge_queue 的 p_sort 一一對應。排的是每一列
 * 那一份申請的送出時間（畫面上「…申請」的那個時間）。
 *   oldest：等最久的在前（原本的順序）
 *   newest：剛送出的在前
 */
export const BADGE_SORTS = ["oldest", "newest"] as const;
export type BadgeSort = (typeof BADGE_SORTS)[number];

/** 沒帶就是原本的「最舊的先」。帶了但認不得是 400，不是默默退回預設。 */
export function badgeSort(value: string | null): BadgeSort {
  if (value === null || value === "") return "oldest";
  return oneOf(value, BADGE_SORTS, "sort");
}

/**
 * GET /api/admin/badges 的查詢參數 → admin_badge_queue 的參數（少了
 * p_admin_id，那個由 withAdmin 給）。
 *
 * 預設的排法不帶 p_sort，交給 rpc 的預設值：這樣網站比資料庫先上線的話，
 * 只有「最新申請」那一顆會失敗，預設的清單照常能看。
 */
export function badgeQueueParams(url: URL): {
  p_status: (typeof BADGE_STATUSES)[number] | null;
  p_sort?: BadgeSort;
  p_limit: number;
  p_offset: number;
} {
  const { limit, offset } = pageParams(url);
  const status = url.searchParams.get("status") ?? "pending";
  if (status !== "all" && !(BADGE_STATUSES as readonly string[]).includes(status)) {
    throw new BadInput("unknown status");
  }
  const sort = badgeSort(url.searchParams.get("sort"));
  return {
    p_status: status === "all" ? null : (status as (typeof BADGE_STATUSES)[number]),
    ...(sort !== "oldest" ? { p_sort: sort } : {}),
    p_limit: limit,
    p_offset: offset,
  };
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BadInput("body must be a JSON object");
    }
    return body as Record<string, unknown>;
  } catch (err) {
    if (err instanceof BadInput) throw err;
    throw new BadInput("body must be valid JSON");
  }
}
