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

export interface UserDetail {
  user_id: string;
  display_name: string | null;
  is_verified: boolean;
  is_premium: boolean;
  banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  posts: number;
  comments: number;
  reports_against: number;
  actions_against: number;
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

  user: (userId: string) => call<UserDetail>(`/api/admin/users?user_id=${userId}`),

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
    call<{ items: ActionRow[] }>(`/api/admin/actions?offset=${offset}`).then((r) => r.items),

  reviewBadge: (applicationId: string, approve: boolean, note?: string) =>
    call<{ ok: boolean }>("/api/admin/badges", {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId, approve, note: note ?? null }),
    }),
};
