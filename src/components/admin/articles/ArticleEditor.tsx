"use client";

// 一篇文章的編輯器。左邊寫 Markdown，右邊（或切換）看預覽；儲存走
// POST /api/admin/articles，發布／撤回走 PATCH。圖片先上傳拿到網址，再插進
// 內文或填進封面。

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminRequestError } from "@/lib/admin/client";
import { articlesApi } from "@/lib/admin/articles/client";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_LANGS,
  CATEGORY_LABELS,
  LANG_LABELS,
  defaultSlug,
  humanizeRpcError,
  type ArticleDetail,
  type ArticleDraft,
  type StaffMe,
} from "@/lib/admin/articles/types";
import ArticleBody from "@/components/articles/ArticleBody";
import { button, danger, input, panel, primary } from "../styles";

const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

function emptyDraft(): ArticleDraft {
  return {
    id: null,
    slug: defaultSlug(),
    title: "",
    summary: "",
    body_md: "",
    cover_url: null,
    category: "briefing",
    lang: "zh-Hant",
  };
}

function toDraft(row: ArticleDetail): ArticleDraft {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body_md: row.body_md,
    cover_url: row.cover_url,
    category: row.category,
    lang: row.lang,
  };
}

function describe(err: unknown): string {
  if (err instanceof AdminRequestError) return humanizeRpcError(err.message);
  return err instanceof Error ? err.message : "發生錯誤";
}

export default function ArticleEditor({
  id,
  me,
  onBack,
}: {
  /** null = 新文章 */
  id: string | null;
  me: StaffMe;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<ArticleDraft | null>(id ? null : emptyDraft());
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [hidden, setHidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bodyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    articlesApi
      .get(id)
      .then((row) => {
        if (cancelled) return;
        setDraft(toDraft(row));
        setStatus(row.status);
        setHidden(row.hidden);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describe(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = useCallback(<K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }, []);

  async function save(): Promise<string | null> {
    if (!draft) return null;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { id: savedId } = await articlesApi.save(draft);
      setDraft((d) => (d ? { ...d, id: savedId } : d));
      setDirty(false);
      setNotice("已儲存。");
      return savedId;
    } catch (err) {
      setError(describe(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveAndSetStatus(next: "draft" | "published") {
    const savedId = await save();
    if (!savedId) return;
    setBusy(true);
    try {
      await articlesApi.setStatus(savedId, next);
      setStatus(next);
      setNotice(next === "published" ? "已發布。網站和 App 幾分鐘內會更新。" : "已撤回，網站和 App 不再顯示。");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const { url } = await articlesApi.upload(file);
      return url;
    } catch (err) {
      setError(describe(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function uploadCover(file: File) {
    const url = await upload(file);
    if (url) update("cover_url", url);
  }

  async function insertImage(file: File) {
    const url = await upload(file);
    if (!url || !draft) return;
    const area = bodyRef.current;
    const snippet = `\n![](${url})\n`;
    const at = area ? area.selectionStart : draft.body_md.length;
    const next = draft.body_md.slice(0, at) + snippet + draft.body_md.slice(at);
    update("body_md", next);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      // 游標停在 ![ 和 ] 之間，讓寫手直接打圖片說明。
      const caret = at + 3;
      area.setSelectionRange(caret, caret);
    });
  }

  if (loadError) {
    return (
      <div className={panel}>
        <p className="text-sm text-[var(--val-red)]">{loadError}</p>
        <button className={`${button} mt-3`} onClick={onBack}>
          返回列表
        </button>
      </div>
    );
  }
  if (!draft) return <p className="text-sm opacity-60">載入中…</p>;

  const publicPath = `/zh-TW/articles/${draft.slug}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className={button} onClick={onBack}>
          ← 返回列表
        </button>
        <span className="text-sm opacity-70">
          {draft.id ? (status === "published" ? "已發布" : "草稿") : "新文章"}
          {hidden && <span className="ml-2 text-[var(--val-red)]">（管理員已下架）</span>}
          {dirty && <span className="ml-2 opacity-60">· 有未儲存的修改</span>}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={() => void save()}>
            儲存
          </button>
          {status === "published" ? (
            <button className={danger} disabled={busy} onClick={() => void saveAndSetStatus("draft")}>
              儲存並撤回
            </button>
          ) : (
            <button className={primary} disabled={busy} onClick={() => void saveAndSetStatus("published")}>
              儲存並發布
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-[var(--val-red)]">{error}</p>}
      {notice && !error && (
        <p className="text-sm text-[var(--jett-blue)]">
          {notice}
          {status === "published" && draft.id && (
            <>
              {" "}
              <a className="underline" href={`${SITE}${publicPath}`} target="_blank" rel="noopener noreferrer">
                打開網頁版
              </a>
            </>
          )}
        </p>
      )}

      <div className={`${panel} space-y-3`}>
        <label className="block text-sm">
          <span className="block mb-1 opacity-70">標題</span>
          <input
            className={input}
            value={draft.title}
            maxLength={120}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm md:col-span-1">
            <span className="block mb-1 opacity-70">網址代稱</span>
            <input
              className={input}
              value={draft.slug}
              maxLength={80}
              onChange={(e) => update("slug", e.target.value.toLowerCase())}
            />
            <span className="block mt-1 text-xs opacity-50 break-all">
              {SITE}
              {publicPath}
            </span>
          </label>
          <label className="block text-sm">
            <span className="block mb-1 opacity-70">分類</span>
            <select
              className={input}
              value={draft.category}
              onChange={(e) => update("category", e.target.value as ArticleDraft["category"])}
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block mb-1 opacity-70">語言</span>
            <select
              className={input}
              value={draft.lang}
              onChange={(e) => update("lang", e.target.value as ArticleDraft["lang"])}
            >
              {ARTICLE_LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="block mb-1 opacity-70">
            摘要 <span className="opacity-50">（列表和分享預覽會顯示，{draft.summary.length}/300）</span>
          </span>
          <textarea
            className={`${input} min-h-16`}
            value={draft.summary}
            maxLength={300}
            onChange={(e) => update("summary", e.target.value)}
          />
        </label>

        <div className="text-sm">
          <span className="block mb-1 opacity-70">封面圖</span>
          <div className="flex flex-wrap gap-2">
            <input
              className={`${input} flex-1 min-w-60`}
              placeholder="https://…（可留空）"
              value={draft.cover_url ?? ""}
              onChange={(e) => update("cover_url", e.target.value === "" ? null : e.target.value)}
            />
            <button className={button} disabled={busy} onClick={() => coverFileRef.current?.click()}>
              上傳封面
            </button>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadCover(file);
              }}
            />
          </div>
          {draft.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.cover_url}
              alt=""
              className="mt-2 max-h-48 rounded border border-[var(--border-dim)] object-cover"
            />
          )}
        </div>
      </div>

      <div className={`${panel} space-y-2`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="opacity-70">內文（Markdown）</span>
          <span className="text-xs opacity-50">
            # 標題、**粗體**、- 清單、[文字](網址)、![說明](圖片網址)
          </span>
          <div className="ml-auto flex gap-2">
            <button className={button} disabled={busy} onClick={() => bodyFileRef.current?.click()}>
              插入圖片
            </button>
            <input
              ref={bodyFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void insertImage(file);
              }}
            />
            <button
              className={`${button} ${preview ? "bg-[var(--bg-panel-hover)]" : ""}`}
              onClick={() => setPreview((p) => !p)}
              aria-pressed={preview}
            >
              {preview ? "回到編輯" : "預覽"}
            </button>
          </div>
        </div>
        {preview ? (
          <div className="rounded border border-[var(--border-dim)] p-4 min-h-96">
            {draft.body_md.trim() === "" ? (
              <p className="text-sm opacity-50">還沒有內文。</p>
            ) : (
              <ArticleBody markdown={draft.body_md} />
            )}
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            className={`${input} min-h-96 font-mono leading-relaxed`}
            value={draft.body_md}
            onChange={(e) => update("body_md", e.target.value)}
            spellCheck={false}
          />
        )}
        <p className="text-xs opacity-50">
          {draft.body_md.length.toLocaleString()} / 60,000 字 · 署名：{me.display_name ?? "DailyVal"}
        </p>
      </div>
    </div>
  );
}
