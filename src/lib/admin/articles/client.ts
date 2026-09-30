"use client";

// 文章後台的瀏覽器端。跟 ../client.ts 一樣只做一件事：把 session 的 token
// 附在請求上；「我是誰、能做什麼」由伺服器回答。

import { accessToken, AdminRequestError, call } from "@/lib/admin/client";
import type { ArticleDetail, ArticleDraft, ArticleRow, StaffMe, WriterRow } from "./types";

export const articlesApi = {
  me: () => call<StaffMe>("/api/admin/articles/me"),

  list: (offset = 0, limit = 50) =>
    call<{ items: ArticleRow[] }>(`/api/admin/articles?offset=${offset}&limit=${limit}`),

  get: (id: string) => call<ArticleDetail>(`/api/admin/articles/${id}`),

  save: (draft: ArticleDraft) =>
    call<{ id: string }>("/api/admin/articles", { method: "POST", body: JSON.stringify(draft) }),

  setStatus: (id: string, status: "draft" | "published") =>
    call<{ changed: boolean }>(`/api/admin/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  setHidden: (id: string, hidden: boolean) =>
    call<{ changed: boolean }>(`/api/admin/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ hidden }),
    }),

  remove: (id: string) => call<{ ok: true }>(`/api/admin/articles/${id}`, { method: "DELETE" }),

  writers: () => call<{ items: WriterRow[] }>("/api/admin/articles/writers"),

  setWriter: (input: { user_id: string; display_name: string; active: boolean; note?: string }) =>
    call<{ ok: true }>("/api/admin/articles/writers", { method: "PUT", body: JSON.stringify(input) }),

  setMyName: (display_name: string) =>
    call<{ ok: true }>("/api/admin/articles/writers", {
      method: "PATCH",
      body: JSON.stringify({ display_name }),
    }),

  /** multipart 不能帶 JSON 的 Content-Type，所以不走 call。 */
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file, file.name);
    const res = await fetch("/api/admin/articles/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}` },
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
