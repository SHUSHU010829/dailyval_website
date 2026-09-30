"use client";

// 文章後台。三個畫面：我的文章（管理員看全部）、編輯器、寫手名單（管理員）。
// 這個元件不判斷權限：登入之後先問 /api/admin/articles/me，404 就是
// 「你不是寫手」，畫面改成顯示自己的 ID 讓對方拿去給管理員。

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminRequestError } from "@/lib/admin/client";
import { articlesApi } from "@/lib/admin/articles/client";
import {
  CATEGORY_LABELS,
  LANG_LABELS,
  humanizeRpcError,
  type ArticleRow,
  type StaffMe,
} from "@/lib/admin/articles/types";
import { AdminSignIn, useAdminSession } from "../AdminSession";
import { button, danger, input, panel, primary } from "../styles";
import ArticleEditor from "./ArticleEditor";
import WritersPanel from "./WritersPanel";

const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

function describe(err: unknown): string {
  if (err instanceof AdminRequestError) return humanizeRpcError(err.message);
  return err instanceof Error ? err.message : "發生錯誤";
}

function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
}

export default function ArticlesConsole() {
  const session = useAdminSession();

  if (!session.ready) return <p className="p-8 text-sm opacity-60">載入中…</p>;
  if (!session.uid) {
    return (
      <AdminSignIn
        title="文章後台"
        onSignIn={() => void session.signIn()}
        notice={session.notice}
        onError={session.setNotice}
      />
    );
  }
  // key={uid}：換帳號要把載入過的東西整個丟掉（同 AdminConsole）。
  return <StaffGate key={session.uid} uid={session.uid} onSignOut={session.signOut} />;
}

function StaffGate({ uid, onSignOut }: { uid: string; onSignOut: () => void }) {
  // undefined = 還在問；null = 不是寫手也不是管理員。
  const [me, setMe] = useState<StaffMe | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async () => {
    try {
      setMe(await articlesApi.me());
    } catch (err) {
      if (err instanceof AdminRequestError && err.status === 404) {
        setMe(null);
        return;
      }
      setError(describe(err));
    }
  }, []);

  useEffect(() => {
    // 第一次問身分。用 then 鏈而不是直接呼叫 ask()：effect 本體不同步 setState。
    let alive = true;
    articlesApi
      .me()
      .then((who) => alive && setMe(who))
      .catch((err) => {
        if (!alive) return;
        if (err instanceof AdminRequestError && err.status === 404) setMe(null);
        else setError(describe(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-md space-y-3">
        <p className="text-sm text-[var(--val-red)]">{error}</p>
        <button className={button} onClick={onSignOut}>
          登出
        </button>
      </div>
    );
  }
  if (me === undefined) return <p className="p-8 text-sm opacity-60">確認身分中…</p>;
  if (me === null) {
    return (
      <div className="p-8 max-w-lg space-y-4">
        <h1 className="text-xl font-[family-name:var(--font-display)]">文章後台</h1>
        <p className="text-sm">你已登入，但還不在寫手名單裡。把下面這個 ID 交給管理員，加進名單後重新整理就能開始寫。</p>
        <div className={panel}>
          <p className="text-xs opacity-60 mb-1">你的 ID</p>
          <code className="text-sm break-all select-all">{uid}</code>
        </div>
        <div className="flex gap-2">
          <button className={button} onClick={() => void navigator.clipboard?.writeText(uid)}>
            複製 ID
          </button>
          <button className={button} onClick={() => void ask()}>
            重新確認
          </button>
          <button className={`${button} ml-auto`} onClick={onSignOut}>
            登出
          </button>
        </div>
      </div>
    );
  }
  return <Workspace me={me} onSignOut={onSignOut} onMeChanged={ask} />;
}

type View = { kind: "list" } | { kind: "edit"; id: string | null } | { kind: "writers" };

function Workspace({
  me,
  onSignOut,
  onMeChanged,
}: {
  me: StaffMe;
  onSignOut: () => void;
  onMeChanged: () => Promise<void>;
}) {
  const [view, setView] = useState<View>({ kind: "list" });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-xl font-[family-name:var(--font-display)]">文章後台</h1>
        <nav className="flex gap-2">
          <button
            className={`${button} ${view.kind !== "writers" ? "bg-[var(--bg-panel-hover)]" : ""}`}
            onClick={() => setView({ kind: "list" })}
          >
            文章
          </button>
          {me.role === "admin" && (
            <button
              className={`${button} ${view.kind === "writers" ? "bg-[var(--bg-panel-hover)]" : ""}`}
              onClick={() => setView({ kind: "writers" })}
            >
              寫手
            </button>
          )}
          <Link className={button} href="/admin">
            回主後台
          </Link>
        </nav>
        <span className="text-xs opacity-60">
          {me.role === "admin" ? "管理員" : "寫手"} · 署名 {me.display_name ?? "（未設定）"}
        </span>
        <button className={`${button} ml-auto`} onClick={onSignOut}>
          登出
        </button>
      </header>

      {view.kind === "list" && (
        <ArticleList
          me={me}
          onNew={() => setView({ kind: "edit", id: null })}
          onEdit={(id) => setView({ kind: "edit", id })}
          onMeChanged={onMeChanged}
        />
      )}
      {view.kind === "edit" && <ArticleEditor id={view.id} me={me} onBack={() => setView({ kind: "list" })} />}
      {view.kind === "writers" && <WritersPanel />}
    </div>
  );
}

function ArticleList({
  me,
  onNew,
  onEdit,
  onMeChanged,
}: {
  me: StaffMe;
  onNew: () => void;
  onEdit: (id: string) => void;
  onMeChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<ArticleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [byline, setByline] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { items } = await articlesApi.list(0, 200);
      setRows(items);
      setError(null);
    } catch (err) {
      setError(describe(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    articlesApi
      .list(0, 200)
      .then(({ items }) => alive && setRows(items))
      .catch((err) => alive && setError(describe(err)));
    return () => {
      alive = false;
    };
  }, []);

  async function act(id: string, run: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await run();
      await reload();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveByline() {
    if (byline === null) return;
    setBusy("byline");
    setError(null);
    try {
      await articlesApi.setMyName(byline);
      await onMeChanged();
      await reload();
      setByline(null);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={primary} onClick={onNew}>
          ＋ 新文章
        </button>
        {byline === null ? (
          <button className={button} onClick={() => setByline(me.display_name ?? "")}>
            修改署名
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <input
              className={`${input} w-48`}
              value={byline}
              maxLength={40}
              placeholder="署名"
              onChange={(e) => setByline(e.target.value)}
            />
            <button className={button} disabled={busy === "byline" || byline.trim() === ""} onClick={() => void saveByline()}>
              儲存
            </button>
            <button className={button} onClick={() => setByline(null)}>
              取消
            </button>
          </span>
        )}
        <button className={`${button} ml-auto`} onClick={() => void reload()}>
          重新整理
        </button>
      </div>
      {error && <p className="text-sm text-[var(--val-red)]">{error}</p>}

      {rows === null ? (
        <p className="text-sm opacity-60">載入中…</p>
      ) : rows.length === 0 ? (
        <div className={panel}>
          <p className="text-sm opacity-70">還沒有文章。按「新文章」開始寫第一篇。</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const canDelete = me.role === "admin" || row.status === "draft";
            const live = row.status === "published" && !row.hidden;
            return (
              <li key={row.id} className={`${panel} flex flex-wrap items-start gap-3`}>
                {row.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.cover_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-24 rounded object-cover border border-[var(--border-dim)]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        live
                          ? "border-[var(--jett-blue)] text-[var(--jett-blue)]"
                          : "border-[var(--border-med)] opacity-70"
                      }`}
                    >
                      {row.status === "published" ? (row.hidden ? "已下架" : "已發布") : "草稿"}
                    </span>
                    <span className="opacity-60">{CATEGORY_LABELS[row.category] ?? row.category}</span>
                    <span className="opacity-60">{LANG_LABELS[row.lang] ?? row.lang}</span>
                    {me.role === "admin" && <span className="opacity-60">{row.author_name ?? "DailyVal"}</span>}
                    <span className="opacity-50">更新 {when(row.updated_at)}</span>
                  </div>
                  <button className="mt-1 text-left font-semibold hover:underline" onClick={() => onEdit(row.id)}>
                    {row.title}
                  </button>
                  {row.summary && <p className="text-sm opacity-70 line-clamp-2">{row.summary}</p>}
                  <p className="text-xs opacity-50 font-mono break-all">/articles/{row.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button className={button} onClick={() => onEdit(row.id)}>
                    編輯
                  </button>
                  {row.status === "published" ? (
                    <button
                      className={button}
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => articlesApi.setStatus(row.id, "draft"))}
                    >
                      撤回
                    </button>
                  ) : (
                    <button
                      className={primary}
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => articlesApi.setStatus(row.id, "published"))}
                    >
                      發布
                    </button>
                  )}
                  {me.role === "admin" && row.status === "published" && (
                    <button
                      className={row.hidden ? button : danger}
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => articlesApi.setHidden(row.id, !row.hidden))}
                    >
                      {row.hidden ? "恢復" : "下架"}
                    </button>
                  )}
                  {live && (
                    <a
                      className={button}
                      href={`${SITE}/zh-TW/articles/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      看網頁
                    </a>
                  )}
                  {canDelete &&
                    (confirmDelete === row.id ? (
                      <>
                        <button
                          className={danger}
                          disabled={busy === row.id}
                          onClick={() => {
                            setConfirmDelete(null);
                            void act(row.id, () => articlesApi.remove(row.id));
                          }}
                        >
                          確定刪除
                        </button>
                        <button className={button} onClick={() => setConfirmDelete(null)}>
                          取消
                        </button>
                      </>
                    ) : (
                      <button className={button} onClick={() => setConfirmDelete(row.id)}>
                        刪除
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
