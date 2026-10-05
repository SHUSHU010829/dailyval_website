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
  // 收下不等於到期日變了（兩小時內的重複贈送），實際的看重查到的狀態。
  applied: "RevenueCat 已收下",
  failed: "RevenueCat 拒絕",
  unknown: "結果不明",
};

/** premium_grants.error 裡有特別意思的值。其他（revenuecat_404 之類）原樣顯示。 */
export const GRANT_ERROR_LABELS: Record<string, string> = {
  nothing_to_revoke: "沒有可收回的贈送",
  revenuecat_unreachable: "連不上 RevenueCat",
};

/**
 * 會員的到期日。RevenueCat 把永久的贈送存成兩百年後的日期，不是 null，
 * 所以一百年以上也當成永久。
 */
export function expiryLabel(iso: string | null, now = Date.now()): string {
  if (iso === null) return "永久";
  const ms = Date.parse(iso);
  if (ms - now > 100 * 365 * 24 * 3600 * 1000) return "永久";
  return new Date(ms).toLocaleString();
}

/** 送出之後 RevenueCat 回來的樣子（edge function admin-premium 的 200）。 */
/**
 * 結果不明（504）時給管理員的話：RevenueCat 沒正常回應，但我們馬上重查了一次。
 * 同樣是「有效」，送和收回的意思相反，所以要知道是哪一個。
 */
export function unsettledMessage(
  action: "grant" | "revoke",
  d: { active?: unknown; expires_at?: unknown; synced?: unknown }
): string {
  const parts = ["RevenueCat 沒有正常回應，不確定這次有沒有生效。"];
  const expiry = typeof d.expires_at === "string" ? d.expires_at : null;
  if (d.active === true) {
    parts.push(
      action === "grant"
        ? `剛剛重查：RevenueCat 上是有效的，到期 ${expiryLabel(expiry)}。到期日是這次要的，就是送成功了。`
        : `剛剛重查：RevenueCat 上還是有效的，到期 ${expiryLabel(expiry)}（可能是付費訂閱，或收回還沒生效）。稍後按「向 RevenueCat 重新確認」。`
    );
  } else if (d.active === false) {
    parts.push(
      action === "grant"
        ? // RevenueCat 可能還在處理這次的請求：沒看到不等於沒生效。
          "剛剛重查時還沒看到 Premium，結果仍不明。稍後按「向 RevenueCat 重新確認」。"
        : "剛剛重查：RevenueCat 上已經沒有 Premium。"
    );
  } else {
    parts.push("也查不到現在的狀態，等一下按「向 RevenueCat 重新確認」。");
  }
  if (d.active === true || d.active === false) {
    if (d.synced !== true) parts.push("下面卡片上的狀態還沒更新。");
  }
  parts.push("同一個人兩分鐘內不能再改。");
  return parts.join("");
}

export interface PremiumChangeResult {
  ok: boolean;
  /** 我們要求的到期日。永久與收回是 null。 */
  ends_at: string | null;
  /** RevenueCat 之前沒看過這個帳號：對方還沒在新版 App 登入過。 */
  new_customer: boolean;
  /** 金勾已經照 RevenueCat 的現況更新。false 時稍後由 webhook 補上。 */
  synced: boolean;
  /** RevenueCat 現在的狀態。重查失敗時是 null。 */
  active: boolean | null;
  expires_at: string | null;
}

/** 給管理員看的一句話。 */
export function changeMessage(
  action: "grant" | "revoke" | "refresh",
  r: PremiumChangeResult
): string {
  const parts: string[] = [
    action === "grant" ? "已送出。" : action === "revoke" ? "已收回贈送的 Premium。" : "",
  ];
  if (r.active === true) {
    parts.push(
      action === "revoke"
        ? `對方還有其他有效的 Premium（例如 App Store 訂閱），到期：${expiryLabel(r.expires_at)}。`
        : `RevenueCat 現在：有效，到期 ${expiryLabel(r.expires_at)}。`
    );
  } else if (r.active === false && action === "refresh") {
    parts.push("RevenueCat 現在：沒有 Premium。");
  } else if (r.active === null) {
    parts.push("查不到 RevenueCat 現在的狀態。");
  }
  // 查到了但沒寫進資料庫：卡片和金勾還是舊的，等 webhook 補。
  if (!r.synced) parts.push("金勾稍後更新。");
  if (r.new_customer) {
    parts.push("RevenueCat 之前沒看過這個帳號（對方還沒在新版 App 登入過），對方登入後就會生效。");
  }
  return parts.join("");
}

export type PremiumChange =
  | { action: "grant"; user_id: string; duration: PremiumDuration; reason: string }
  /** 收回沒有期限，送出去是 null。 */
  | { action: "revoke"; user_id: string; duration: null; reason: string }
  /** 只向 RevenueCat 重查，不留紀錄，所以不用理由。 */
  | { action: "refresh"; user_id: string };

/** POST /api/admin/premium 的 body。 */
export function premiumChange(body: Record<string, unknown>): PremiumChange {
  const action = oneOf(body.action, ["grant", "revoke", "refresh"] as const, "action");
  const userId = uuid(body.user_id, "user_id");
  if (action === "refresh") return { action, user_id: userId };
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
      body: {
        ok: true,
        ends_at: body.ends_at ?? null,
        new_customer: body.new_customer === true,
        synced: body.synced === true,
        active: typeof body.active === "boolean" ? body.active : null,
        expires_at: body.expires_at ?? null,
      },
    };
  }
  if (status === 409 && body?.error === "in_progress") {
    return {
      status: 409,
      body: {
        error:
          "這個人還有一件 Premium 變更在處理中或結果不明，兩分鐘內不能再改。可以先按「向 RevenueCat 重新確認」看現況。",
      },
    };
  }
  if (status === 409 && body?.error === "nothing_to_revoke") {
    return {
      status: 409,
      body: { error: "對方沒有贈送的 Premium 可以收回。App Store 的付費訂閱不能從這裡收回。" },
    };
  }
  if (status === 400 && typeof body?.error === "string") {
    return { status: 400, body: { error: body.error } };
  }
  if (status === 502 && body?.error === "revenuecat_rejected") {
    return {
      status: 502,
      body: {
        error:
          body.status === 0
            ? "連不上 RevenueCat，什麼都還沒送出。"
            : `RevenueCat 拒絕了這次變更（HTTP ${body.status}），什麼都沒有改。`,
      },
    };
  }
  if (status === 504 && body?.error === "revenuecat_unreachable") {
    // 重查到的狀態原樣帶回去，由瀏覽器組句子（unsettledMessage）：日期要用
    // 管理員那邊的時區，而且要看這次是送還是收回。error 是沒組句子時的退路。
    return {
      status: 504,
      body: {
        error: "RevenueCat 沒有正常回應，不確定這次有沒有生效。按「向 RevenueCat 重新確認」看現況。",
        active: typeof body.active === "boolean" ? body.active : null,
        expires_at: body.expires_at ?? null,
        synced: body.synced === true,
      },
    };
  }
  if (status === 502 && body?.error === "revenuecat_lookup_failed") {
    return { status: 502, body: { error: "RevenueCat 沒有回應，查不到現在的狀態。" } };
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
  /** 要求的到期日。 */
  ends_at: string | null;
  reason: string;
  status: string;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  /** 送完之後向 RevenueCat 重查到的狀態。沒查到是 null。 */
  observed_active: boolean | null;
  observed_expires_at: string | null;
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
