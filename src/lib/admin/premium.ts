// 送 Premium：期限清單、請求的驗證、edge function 回應的翻譯。
//
// 這裡沒有 `server-only`：清單和型別瀏覽器也要用，而且一個機密都不碰。
// 真正送出去的是 server route（src/app/api/admin/premium/route.ts）→ Supabase
// edge function admin-premium → RevenueCat。
//
// 期限清單跟資料庫是同一份（identity.premium_grants 的 CHECK 與
// social.admin_begin_premium_change，見 DailyVal 的
// supabase/migrations/20261005150000_admin_premium_grants.sql）。改一邊要改另一邊；
// 這裡多一個資料庫不認得的值，送出去會被 22023 擋下來。

import { BadInput, oneOf, reason, uuid } from "./validate";

export const PREMIUM_DURATIONS = [
  ["one_week", "1 週"],
  ["one_month", "1 個月"],
  ["three_months", "3 個月"],
  ["six_months", "6 個月"],
  ["one_year", "1 年"],
  ["lifetime", "永久"],
] as const;

export type PremiumDuration = (typeof PREMIUM_DURATIONS)[number][0];

const DURATION_KEYS = PREMIUM_DURATIONS.map(([key]) => key);

export function durationLabel(value: string | null): string {
  return PREMIUM_DURATIONS.find(([key]) => key === value)?.[1] ?? value ?? "";
}

/** 一次送／收回在 RevenueCat 那邊的結果。 */
export const GRANT_STATUS_LABELS: Record<string, string> = {
  pending: "處理中",
  applied: "已生效",
  failed: "RevenueCat 拒絕",
  unknown: "結果不明",
};

export interface PremiumChange {
  action: "grant" | "revoke";
  user_id: string;
  /** 收回沒有期限，送出去是 null。 */
  duration: PremiumDuration | null;
  reason: string;
}

/** POST /api/admin/premium 的 body。 */
export function premiumChange(body: Record<string, unknown>): PremiumChange {
  const action = oneOf(body.action, ["grant", "revoke"] as const, "action");
  const userId = uuid(body.user_id, "user_id");
  const why = reason(body.reason, { required: true })!;
  if (action === "revoke") {
    if (body.duration !== undefined && body.duration !== null) {
      throw new BadInput("a revoke takes no duration");
    }
    return { action, user_id: userId, duration: null, reason: why };
  }
  return { action, user_id: userId, duration: oneOf(body.duration, DURATION_KEYS, "duration"), reason: why };
}

/**
 * edge function 的回應 → 給後台的回應。200 原樣（只留需要的欄位）；
 * 管理員填錯的（400）訊息原樣；RevenueCat 的兩種失敗講清楚有沒有生效；
 * 其他一律 server_error，原文只進伺服器日誌。
 */
export function premiumResult(status: number, body: Record<string, unknown> | null): {
  status: number;
  body: Record<string, unknown>;
} {
  if (status === 200 && body?.ok === true) {
    return {
      status: 200,
      body: { ok: true, ends_at: body.ends_at ?? null, synced: body.synced === true },
    };
  }
  if (status === 400 && typeof body?.error === "string") {
    return { status: 400, body: { error: body.error } };
  }
  if (status === 502 && body?.error === "revenuecat_rejected") {
    return {
      status: 502,
      body: { error: `RevenueCat 拒絕了這次變更（HTTP ${body.status}），什麼都沒有改。` },
    };
  }
  if (status === 504 && body?.error === "revenuecat_unreachable") {
    return {
      status: 504,
      body: {
        error: "連不上 RevenueCat，不確定有沒有生效。重新整理看 Premium 狀態，沒有生效再送一次。",
      },
    };
  }
  if (status === 503 && body?.error === "premium_not_configured") {
    return { status: 503, body: { error: "這個環境還沒有設定 RevenueCat。" } };
  }
  return { status: 500, body: { error: "server_error" } };
}

/** 搜尋結果的一列（social.admin_person_search）。 */
export interface PersonHit {
  user_id: string;
  display_name: string | null;
  game_name: string | null;
  tag_line: string | null;
  riot_puuid: string | null;
  rank_tier: number | null;
  is_verified: boolean;
  premium_active: boolean;
  premium_expires_at: string | null;
  banned: boolean;
  created_at: string;
  /** id / puuid / exact / name / prefix / contains */
  matched: string;
}

export const MATCH_LABELS: Record<string, string> = {
  id: "帳號 id",
  puuid: "puuid",
  exact: "完全相同",
  name: "名字相同",
  prefix: "名字開頭",
  contains: "名字含有",
};

/** 一次送／收回（admin_premium_detail 的 grants、admin_premium_log 的列）。 */
export interface PremiumGrant {
  grant_id: string;
  action: "grant" | "revoke";
  duration: string | null;
  ends_at: string | null;
  reason: string;
  status: string;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  created_by_name: string | null;
}

export interface PremiumLogRow extends PremiumGrant {
  user_id: string | null;
  display_name: string | null;
  subject_deleted: boolean;
  total_grants: number;
}

/** 個人卡片上的會員區（social.admin_premium_detail）。 */
export interface PremiumDetail {
  /** 現在是不是 Premium（到期已經算進去）。 */
  active: boolean;
  /** 我們最後一次從 RevenueCat 看到的狀態。從來沒同步過是 null。 */
  membership: {
    active: boolean;
    expires_at: string | null;
    observed_at: string;
    checked_at: string;
  } | null;
  grants: PremiumGrant[];
}
