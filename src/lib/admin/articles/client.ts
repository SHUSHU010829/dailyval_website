"use client";

// 文章後台的瀏覽器端。跟 ../client.ts 一樣只做一件事：把 session 的 token
// 附在請求上；「我是誰、能做什麼」由伺服器回答。

import { AdminRequestError, call } from "@/lib/admin/client";
import { getSupabase } from "@/lib/esports/supabase-client";
import type { ArticleDetail, ArticleDraft, ArticleRow, StaffMe, WriterRow } from "./types";

/** 會改資料的呼叫都帶 asUid：發起的帳號。中途換帳號就不送。 */
export const articlesApi = {
  me: () => call<StaffMe>("/api/writer/me"),

  list: (offset = 0, limit = 50) =>
    call<{ items: ArticleRow[] }>(`/api/writer/articles?offset=${offset}&limit=${limit}`),

  get: (id: string) => call<ArticleDetail>(`/api/writer/articles/${id}`),

  save: (draft: ArticleDraft, asUid: string) =>
    call<{ id: string }>("/api/writer/articles", { method: "POST", body: JSON.stringify(draft) }, { asUid }),

  setStatus: (id: string, status: "draft" | "published", asUid: string) =>
    call<{ changed: boolean }>(
      `/api/writer/articles/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      { asUid }
    ),

  setHidden: (id: string, hidden: boolean, asUid: string) =>
    call<{ changed: boolean }>(
      `/api/writer/articles/${id}`,
      { method: "PATCH", body: JSON.stringify({ hidden }) },
      { asUid }
    ),

  remove: (id: string, asUid: string) =>
    call<{ ok: true }>(`/api/writer/articles/${id}`, { method: "DELETE" }, { asUid }),

  writers: () => call<{ items: WriterRow[] }>("/api/writer/staff"),

  setWriter: (input: { user_id: string; display_name: string; active: boolean; note?: string }, asUid: string) =>
    call<{ ok: true }>("/api/writer/staff", { method: "PUT", body: JSON.stringify(input) }, { asUid }),

  /** profile_url 空字串 = 清掉作者網址。 */
  setMyByline: (input: { display_name: string; profile_url: string }, asUid: string) =>
    call<{ ok: true }>("/api/writer/staff", { method: "PATCH", body: JSON.stringify(input) }, { asUid }),

  /** multipart 不能帶 JSON 的 Content-Type，所以不走 call；帳號的比對一樣做。 */
  upload: async (file: File, asUid: string): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file, file.name);
    const { data } = await getSupabase().auth.getSession();
    const session = data.session;
    if (!session?.access_token) throw new AdminRequestError("尚未登入", 401);
    if (session.user.id !== asUid) throw new AdminRequestError("登入的帳號已經換了，這個動作沒有送出", 401);
    const res = await fetch("/api/writer/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new AdminRequestError(body?.error ?? `上傳失敗（${res.status}）`, res.status);
    }
    return (await res.json()) as { url: string };
  },
};
