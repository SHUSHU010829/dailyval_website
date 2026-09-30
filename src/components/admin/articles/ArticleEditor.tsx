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
import {
  clearDraftBackup,
  draftBackupKey,
  readDraftBackup,
  shouldOfferRestore,
  writeDraftBackup,
  type DraftBackup,
} from "@/lib/admin/articles/draftBackup";
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
  onDirtyChange,
}: {
  /** null = 新文章 */
  id: string | null;
  me: StaffMe;
  onBack: () => void;
  /** 有沒有未儲存的修改。上層用它在離開前先問一聲。 */
  onDirtyChange?: (dirty: boolean) => void;
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
  /** 瀏覽器裡還有一份沒儲存的備份：問要不要恢復。 */
  const [restorable, setRestorable] = useState<DraftBackup | null>(null);
  const backupKey = draftBackupKey(me.uid, id);
  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 內文圖片上傳中：textarea 唯讀，插入位置才不會跑掉。 */
  const [uploadingBody, setUploadingBody] = useState(false);
  /** 封面上傳中：網址欄唯讀，上傳完成才不會蓋掉這幾秒貼進來的別的網址。 */
  const [uploadingCover, setUploadingCover] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 每一次修改都推一個版本號。儲存只在「送出去的就是現在這一版」時才算存乾淨，
  // 否則儲存中打的字會被標成已儲存，離開就丟了。
  const revision = useRef(0);
  // key={uid} 換帳號時這個元件會被卸載，但已經開始的 async 流程還在跑；
  // 卸載後就不再送任何請求（否則「儲存並發布」的後半段會用新帳號的 token 送出去）。
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // 關分頁、重新整理：瀏覽器自己會問「確定離開？」。站內的離開由上層問。
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bodyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      // 新文章：上次打到一半沒存的還在就問。（排到下一個 microtask：effect 本體
      // 不同步 setState，畫面也已經 hydrate 完才讀 localStorage。）
      void Promise.resolve().then(() => {
        if (cancelled) return;
        const backup = readDraftBackup(backupKey);
        if (shouldOfferRestore(backup, null)) setRestorable(backup);
      });
      return () => {
        cancelled = true;
      };
    }
    articlesApi
      .get(id)
      .then((row) => {
        if (cancelled) return;
        const server = toDraft(row);
        setDraft(server);
        setStatus(row.status);
        setHidden(row.hidden);
        const backup = readDraftBackup(backupKey);
        if (shouldOfferRestore(backup, { updatedAt: row.updated_at, draft: server })) setRestorable(backup);
        else clearDraftBackup(backupKey);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describe(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id, backupKey]);

  // 每次修改都備份到瀏覽器（半秒內的連續打字合成一次）。任何離開方式都不會掉字：
  // 站內按鈕會問、關分頁有 beforeunload，瀏覽器的上一頁／下一頁手勢攔不到，就靠這個。
  useEffect(() => {
    if (!dirty || !draft) return;
    if (backupTimer.current) clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(() => writeDraftBackup(backupKey, draft), 500);
    return () => {
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, [draft, dirty, backupKey]);

  function restoreBackup() {
    if (!restorable) return;
    revision.current += 1;
    setDraft({ ...restorable.draft, id });
    setDirty(true);
    setRestorable(null);
  }

  function discardBackup() {
    clearDraftBackup(backupKey);
    setRestorable(null);
  }

  const update = useCallback(<K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => {
    revision.current += 1;
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }, []);

  async function save(): Promise<string | null> {
    if (!draft) return null;
    const sent = revision.current;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { id: savedId } = await articlesApi.save(draft, me.uid);
      if (!mounted.current) return null;
      setDraft((d) => (d ? { ...d, id: savedId } : d));
      if (revision.current === sent) {
        // 存乾淨了：備份沒有存在的理由。新文章的備份在 "new" 那一格，也一併清掉。
        if (backupTimer.current) clearTimeout(backupTimer.current);
        clearDraftBackup(backupKey);
        if (!id) clearDraftBackup(draftBackupKey(me.uid, savedId));
        setDirty(false);
        setNotice("已儲存。");
      } else {
        // 儲存中又改了：存進去的是舊的一版，新的還沒存。
        setNotice("已儲存較早的版本，之後的修改還沒存。");
      }
      return savedId;
    } catch (err) {
      if (mounted.current) setError(describe(err));
      return null;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function saveAndSetStatus(next: "draft" | "published") {
    const savedId = await save();
    if (!savedId || !mounted.current) return;
    setBusy(true);
    try {
      await articlesApi.setStatus(savedId, next, me.uid);
      if (!mounted.current) return;
      setStatus(next);
      setNotice(next === "published" ? "已發布。網站和 App 幾分鐘內會更新。" : "已撤回，網站和 App 不再顯示。");
    } catch (err) {
      if (mounted.current) setError(describe(err));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function upload(file: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const { url } = await articlesApi.upload(file, me.uid);
      return mounted.current ? url : null;
    } catch (err) {
      if (mounted.current) setError(describe(err));
      return null;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    let url: string | null;
    try {
      url = await upload(file);
    } finally {
      if (mounted.current) setUploadingCover(false);
    }
    if (url) update("cover_url", url);
  }

  async function insertImage(file: File) {
    // 插入位置在按下去的那一刻就定下來，上傳中內文唯讀，所以它不會跑掉；
    // 插入時用「現在的」內文，不用開始上傳時抓到的那一份——否則上傳這幾秒
    // 打的字會被整段蓋掉。
    const area = bodyRef.current;
    const at = area?.selectionStart ?? null;
    setUploadingBody(true);
    let url: string | null;
    try {
      url = await upload(file);
    } finally {
      if (mounted.current) setUploadingBody(false);
    }
    if (!url) return;
    const snippet = `\n![](${url})\n`;
    let caret = 0;
    revision.current += 1;
    setDraft((d) => {
      if (!d) return d;
      const position = Math.min(at ?? d.body_md.length, d.body_md.length);
      caret = position + 3;
      return { ...d, body_md: d.body_md.slice(0, position) + snippet + d.body_md.slice(position) };
    });
    setDirty(true);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      // 游標停在 ![ 和 ] 之間，讓寫手直接打圖片說明。
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

      {restorable && (
        <div className={`${panel} flex flex-wrap items-center gap-3`} role="alertdialog">
          <span className="text-sm">
            這篇有一份沒儲存的修改（
            {new Date(restorable.savedAt).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}
            ）。要恢復嗎？
          </span>
          <button className={`${primary} ml-auto`} onClick={restoreBackup}>
            恢復
          </button>
          <button className={button} onClick={discardBackup}>
            丟棄
          </button>
        </div>
      )}
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
              className={`${input} flex-1 min-w-60 ${uploadingCover ? "opacity-70" : ""}`}
              placeholder="https://…（可留空）"
              value={draft.cover_url ?? ""}
              readOnly={uploadingCover}
              aria-busy={uploadingCover}
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
            className={`${input} min-h-96 font-mono leading-relaxed ${uploadingBody ? "opacity-70" : ""}`}
            value={draft.body_md}
            readOnly={uploadingBody}
            aria-busy={uploadingBody}
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
