"use client";

// 文章後台的瀏覽器端。跟 ../client.ts 一樣只做一件事：把 session 的 token
// 附在請求上；「我是誰、能做什麼」由伺服器回答。

import { AdminRequestError, call } from "@/lib/admin/client";
import { getSupabase } from "@/lib/esports/supabase-client";
import type { ArticleDetail, ArticleDraft, ArticleRow, StaffMe, WriterRow } from "./types";

/** 會改資料的呼叫都帶 asUid：發起的帳號。中途換帳號就不送。 */
export const articlesApi = {
  me: () => call<StaffMe>("/api/admin/articles/me"),

  list: (offset = 0, limit = 50) =>
    call<{ items: ArticleRow[] }>(`/api/admin/articles?offset=${offset}&limit=${limit}`),

  get: (id: string) => call<ArticleDetail>(`/api/admin/articles/${id}`),

  save: (draft: ArticleDraft, asUid: string) =>
    call<{ id: string }>("/api/admin/articles", { method: "POST", body: JSON.stringify(draft) }, { asUid }),

  setStatus: (id: string, status: "draft" | "published", asUid: string) =>
    call<{ changed: boolean }>(
      `/api/admin/articles/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      { asUid }
    ),

  setHidden: (id: string, hidden: boolean, asUid: string) =>
    call<{ changed: boolean }>(
      `/api/admin/articles/${id}`,
      { method: "PATCH", body: JSON.stringify({ hidden }) },
      { asUid }
    ),

  remove: (id: string, asUid: string) =>
    call<{ ok: true }>(`/api/admin/articles/${id}`, { method: "DELETE" }, { asUid }),

  writers: () => call<{ items: WriterRow[] }>("/api/admin/articles/writers"),

  setWriter: (input: { user_id: string; display_name: string; active: boolean; note?: string }, asUid: string) =>
    call<{ ok: true }>("/api/admin/articles/writers", { method: "PUT", body: JSON.stringify(input) }, { asUid }),

  setMyName: (display_name: string, asUid: string) =>
    call<{ ok: true }>(
      "/api/admin/articles/writers",
      { method: "PATCH", body: JSON.stringify({ display_name }) },
      { asUid }
    ),

  /** multipart 不能帶 JSON 的 Content-Type，所以不走 call；帳號的比對一樣做。 */
  upload: async (file: File, asUid: string): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file, file.name);
    const { data } = await getSupabase().auth.getSession();
    const session = data.session;
    if (!session?.access_token) throw new AdminRequestError("尚未登入", 401);
    if (session.user.id !== asUid) throw new AdminRequestError("登入的帳號已經換了，這個動作沒有送出", 401);
    const res = await fetch("/api/admin/articles/upload", {
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
