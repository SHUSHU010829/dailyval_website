"use client";

// 瀏覽器這一側只做一件事：把目前 session 的 access token 附在請求上。
// 「我是不是管理員」完全不在這裡判斷，也不讀任何本地旗標——權限的唯一
// 真相在伺服器。唯一會多問一句的是 404 之後：那時問的是「我自己的
// session 還有效嗎」，那件事客戶端本來就知道，不涉及伺服器端的任何判斷。

import { getSupabase } from "@/lib/esports/supabase-client";

export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

async function accessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminRequestError("尚未登入", 401);
  return token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${await accessToken()}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    // 伺服器對「你不是管理員」和「這條路徑不存在」都回 404，那是刻意的：
    // 陌生人不該從回應裡知道這裡有東西。
    //
    // 但還有第三種情況長得一模一樣——session 本身已經失效（帳號被刪、
    // 資料庫被重建、token 過期而刷新失敗）。那一種客戶端自己問得出來，
    // 而且問的是「我自己的 session 還有效嗎」，不會洩漏任何伺服器端的事。
    // 不分辨的話，畫面上只會是一個沒有下文的「找不到」，而正確的動作
    // （重新登入）完全看不出來。
    if (res.status === 404) {
      const { data, error } = await getSupabase().auth.getUser();
      if (error || !data.user) {
        await getSupabase().auth.signOut().catch(() => {});
        throw new AdminRequestError("登入階段已失效，請重新登入", 401);
      }
      throw new AdminRequestError("找不到", 404);
    }
    const body = await res.json().catch(() => null);
    throw new AdminRequestError(body?.error ?? `請求失敗（${res.status}）`, res.status);
  }
  return (await res.json()) as T;
}

// 一列 = 一個待決定的目標，不是一筆檢舉。同一篇貼文被檢舉 18 次仍然只是
// 一個決定，所以 open_reports 是次數，不是列數。
/** R2 的公開網域。key 是永久的，所以組出來的網址也是。 */
export const MEDIA_BASE = "https://img.dailyval.com";

export interface ContentImage {
  key: string;
  /** 約 400px 的縮圖。抽取階段沒生出來的話會退回原圖。 */
  thumb: string;
  width: number | null;
  height: number | null;
  position: number;
}

export const imageURL = (key: string) => `${MEDIA_BASE}/${key}`;

export interface ReportRow {
  target_kind: "post" | "comment";
  target_id: string;
  open_reports: number;
  total_targets: number;
  first_reported_at: string;
  last_reported_at: string;
  reasons: string[];
  /** 作者的完整快照，不只名字。 */
  author: Person;
  /** 檢舉這個目標的人。查不到名字的只有 puuid，但仍然會列出來。 */
  reporters: Person[];
  body: string | null;
  images: ContentImage[];
  /** 這一列還在不在。空的內文不是刪除的證據——見 contentSummary。 */
  content_exists: boolean;
  is_hidden: boolean | null;
  created_at: string | null;
  author_id: string | null;
  author_name: string | null;
  legacy_ck_user: string | null;
  report_count: number;
  prior_actions: number;
  author_prior_actions: number;
}

// 一列 = 一個申請人。1,224 個人送了 1,399 份申請，147 個人送過不只一份，
// 而那仍然只是一個決定。legacy_ck_user 有值代表還沒認領的舊帳號。
export interface BadgeRow {
  application_id: string;
  user_id: string | null;
  legacy_ck_user: string | null;
  display_name: string | null;
  is_verified: boolean;
  nickname: string;
  links: string[];
  intro: string | null;
  more_info: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  application_count: number;
  total_applicants: number;
}

export interface ActionRow {
  action_id: string;
  action: string;
  target_kind: "post" | "comment";
  target_id: string;
  reason: string | null;
  created_at: string;
  total_actions: number;
  admin_name: string | null;
  subject_user_id: string | null;
  subject_name: string | null;
  subject_legacy_ck_user: string | null;
  content_exists: boolean;
  content_body: string | null;
  content_images: ContentImage[];
  content_hidden: boolean | null;
}

/** 一列 = 一次審核判斷。一次判斷會關掉這個人所有待審的申請。 */
export interface BadgeReviewRow {
  application_id: string;
  user_id: string | null;
  legacy_ck_user: string | null;
  display_name: string | null;
  nickname: string;
  links: string[];
  intro: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string;
  reviewer_name: string | null;
  applications_closed: number;
  total_reviews: number;
}

/** 一列 = 一次封禁。解除是同一列上的一次更新，不是另一筆。 */
export interface BanRow {
  ban_id: string;
  /** 帳號被刪掉之後是 null，紀錄本身留著。 */
  user_id: string | null;
  display_name: string | null;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  created_by_name: string | null;
  lifted_at: string | null;
  lifted_by_name: string | null;
  is_active: boolean;
  last_event_at: string;
  /** 被封的帳號已經刪除。名字來自封禁當下的快照。 */
  subject_deleted: boolean;
  total_bans: number;
}

/** 一個人的檔案。認領過的走帳號，沒認領的走 CloudKit 身分。 */
export interface UserDetail {
  user_id: string | null;
  legacy_ck_user: string | null;
  claimed: boolean;
  display_name: string | null;
  is_verified: boolean;
  is_premium: boolean;
  banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  posts: number;
  comments: number;
  hidden_content: number;
  reports_against: number;
  actions_against: number;
  /** 這個 CloudKit 帳號用過的 Riot 身分。多帳號登入是 App 支援的功能。 */
  identities: Person[];
}

/**
 * 一個人的身分快照。
 *
 * `ck_claimed_*` 是 CloudKit 時代客戶端寫得動的旗標，所以是「他當時聲稱的」，
 * 不是事實——顯示它們是為了看得出舊系統長什麼樣，不是拿來當依據。
 */
export interface Person {
  claimed?: boolean;
  user_id?: string | null;
  ck_user?: string | null;
  puuid?: string | null;
  name: string | null;
  tag_line?: string | null;
  image?: string | null;
  rank_tier?: number | null;
  game_name?: string | null;
  is_verified?: boolean;
  is_premium?: boolean;
  ck_claimed_verify?: boolean;
  ck_claimed_premium?: boolean;
}

export const admin = {
  reports: (status = "open", offset = 0) =>
    call<{ items: ReportRow[] }>(
      `/api/admin/reports?status=${status}&offset=${offset}`
    ).then((r) => r.items),

  // 結案是對「目標」下的，不是對單一檢舉。回傳關掉了幾筆；0 不是錯誤——
  // 刪除已經把檢舉一起帶走了，那時候再按結案就是 0。
  resolveTarget: (kind: string, targetId: string, status: string, note?: string) =>
    call<{ ok: boolean; closed: number }>("/api/admin/reports", {
      method: "PATCH",
      body: JSON.stringify({ kind, target_id: targetId, status, note: note ?? null }),
    }),

  setHidden: (kind: string, targetId: string, hidden: boolean, why?: string) =>
    call<{ ok: boolean; changed: boolean }>("/api/admin/content", {
      method: "POST",
      body: JSON.stringify({ action: "hide", kind, target_id: targetId, hidden, reason: why ?? null }),
    }),

  deleteContent: (kind: string, targetId: string, why: string) =>
    call<{ ok: boolean }>("/api/admin/content", {
      method: "POST",
      body: JSON.stringify({ action: "delete", kind, target_id: targetId, reason: why }),
    }),

  person: (key: { userId?: string; legacyCkUser?: string }) =>
    call<UserDetail>(
      `/api/admin/users?${
        key.userId
          ? `user_id=${encodeURIComponent(key.userId)}`
          : `legacy_ck_user=${encodeURIComponent(key.legacyCkUser ?? "")}`
      }`
    ),

  ban: (userId: string, why: string, expiresAt: string | null) =>
    call<{ ok: boolean }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ action: "ban", user_id: userId, reason: why, expires_at: expiresAt }),
    }),

  liftBan: (userId: string) =>
    call<{ ok: boolean; lifted: number }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ action: "lift", user_id: userId }),
    }),

  badges: (status = "pending", offset = 0) =>
    call<{ items: BadgeRow[] }>(
      `/api/admin/badges?status=${status}&offset=${offset}`
    ).then((r) => r.items),

  actions: (offset = 0) =>
    call<{ items: ActionRow[] }>(
      `/api/admin/actions?source=content&offset=${offset}`
    ).then((r) => r.items),

  badgeReviews: (offset = 0) =>
    call<{ items: BadgeReviewRow[] }>(
      `/api/admin/actions?source=badges&offset=${offset}`
    ).then((r) => r.items),

  banLog: (offset = 0) =>
    call<{ items: BanRow[] }>(
      `/api/admin/actions?source=bans&offset=${offset}`
    ).then((r) => r.items),

  reviewBadge: (applicationId: string, approve: boolean, note?: string) =>
    call<{ ok: boolean }>("/api/admin/badges", {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId, approve, note: note ?? null }),
    }),
};
