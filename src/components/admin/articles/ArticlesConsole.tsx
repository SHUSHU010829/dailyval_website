"use client";

// 文章後台。三個畫面：我的文章（管理員看全部）、編輯器、寫手名單（管理員）。
// 這個元件不判斷權限：登入之後先問 /api/writer/me，404 就是
// 「你不是寫手」，畫面改成顯示自己的 ID 讓對方拿去給管理員。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
/** 列表一次讀幾篇。超過的用「載入更多」接下去。 */
const PAGE = 100;

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
        title="寫手後台"
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
        <h1 className="text-xl font-[family-name:var(--font-display)]">寫手後台</h1>
        <p className="text-sm">你已登入，但還不在寫手名單裡。把下面這個 ID 傳給 DailyVal 的管理員，加進名單後按「重新確認」就能開始寫。</p>
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
/** 離開編輯器的去處：站內換畫面、去別的頁、登出。 */
type Leave = { kind: "view"; view: View } | { kind: "href"; href: string } | { kind: "signOut" };

function Workspace({
  me,
  onSignOut,
  onMeChanged,
}: {
  me: StaffMe;
  onSignOut: () => void;
  onMeChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "list" });
  // 編輯器有沒有未儲存的修改。有的話任何離開都先問一聲，不然按錯一下整篇就沒了。
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<Leave | null>(null);

  function go(leave: Leave) {
    if (leave.kind === "view") setView(leave.view);
    else if (leave.kind === "href") router.push(leave.href);
    else onSignOut();
  }

  function leave(target: Leave) {
    if (view.kind === "edit" && editorDirty) {
      setPendingLeave(target);
      return;
    }
    go(target);
  }

  function confirmLeave() {
    const target = pendingLeave;
    setPendingLeave(null);
    setEditorDirty(false);
    if (target) go(target);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-xl font-[family-name:var(--font-display)]">寫手後台</h1>
        <nav className="flex gap-2">
          <button
            className={`${button} ${view.kind !== "writers" ? "bg-[var(--bg-panel-hover)]" : ""}`}
            onClick={() => leave({ kind: "view", view: { kind: "list" } })}
          >
            文章
          </button>
          {me.role === "admin" && (
            <button
              className={`${button} ${view.kind === "writers" ? "bg-[var(--bg-panel-hover)]" : ""}`}
              onClick={() => leave({ kind: "view", view: { kind: "writers" } })}
            >
              寫手
            </button>
          )}
          {me.role === "admin" && (
            <Link
              className={button}
              href="/admin"
              onClick={(event) => {
                if (view.kind === "edit" && editorDirty) {
                  event.preventDefault();
                  setPendingLeave({ kind: "href", href: "/admin" });
                }
              }}
            >
              回主後台
            </Link>
          )}
        </nav>
        <span className="text-xs opacity-60">
          {me.role === "admin" ? "管理員" : "寫手"} · 署名{" "}
          {me.profile_url ? (
            <a href={me.profile_url} target="_blank" rel="noopener noreferrer" className="text-[var(--jett-blue)] underline">
              {me.display_name ?? "（未設定）"}
            </a>
          ) : (
            (me.display_name ?? "（未設定）")
          )}
        </span>
        <button className={`${button} ml-auto`} onClick={() => leave({ kind: "signOut" })}>
          登出
        </button>
      </header>

      {pendingLeave && (
        <div className={`${panel} mb-4 flex flex-wrap items-center gap-3`} role="alertdialog" aria-live="assertive">
          <span className="text-sm">這篇還有未儲存的修改。離開的話會丟掉。</span>
          <button className={`${danger} ml-auto`} onClick={confirmLeave}>
            放棄修改並離開
          </button>
          <button className={button} onClick={() => setPendingLeave(null)}>
            留下
          </button>
        </div>
      )}

      {view.kind === "list" && (
        <ArticleList
          me={me}
          onNew={() => setView({ kind: "edit", id: null })}
          onEdit={(id) => setView({ kind: "edit", id })}
          onMeChanged={onMeChanged}
        />
      )}
      {view.kind === "edit" && (
        <ArticleEditor
          id={view.id}
          me={me}
          onBack={() => leave({ kind: "view", view: { kind: "list" } })}
          onDirtyChange={setEditorDirty}
        />
      )}
      {view.kind === "writers" && <WritersPanel me={me} />}
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // 署名表單：null = 收起來。網址空字串 = 不連結（清掉）。
  const [byline, setByline] = useState<{ name: string; url: string } | null>(null);
  // 每一次讀列表都領一個號碼；只有最新的號碼可以寫進畫面。處置（下架、發布）
  // 開始時也把號碼往前推，讓還在路上的舊讀取作廢——否則舊的一頁回來會把
  // 剛處置完的狀態蓋回去。
  const latest = useRef(0);
  // 第一頁還在路上的次數。這期間不接受「載入更多」：載入更多會領新號碼，
  // 把處置後那次刷新作廢，然後把下一頁接在還沒刷新的舊列表後面。
  const firstPagePending = useRef(0);

  const fetchPage = useCallback(async (from: number) => {
    const ticket = ++latest.current;
    if (from === 0) firstPagePending.current += 1;
    try {
      const { items } = await articlesApi.list(from, PAGE);
      if (ticket !== latest.current) return;
      setRows((r) => (from === 0 || !r ? items : [...r, ...items]));
      setHasMore(items.length === PAGE);
      setError(null);
    } catch (err) {
      if (ticket === latest.current) setError(describe(err));
    } finally {
      if (from === 0) firstPagePending.current -= 1;
    }
  }, []);

  useEffect(() => {
    // 第一頁。跟 fetchPage 同一套號碼規則，只是 effect 本體不能直接呼叫會
    // setState 的函式（react-hooks/set-state-in-effect），所以鏈在 then 裡。
    const ticket = ++latest.current;
    firstPagePending.current += 1;
    articlesApi
      .list(0, PAGE)
      .then(({ items }) => {
        if (ticket !== latest.current) return;
        setRows(items);
        setHasMore(items.length === PAGE);
        setError(null);
      })
      .catch((err) => {
        if (ticket === latest.current) setError(describe(err));
      })
      .finally(() => {
        firstPagePending.current -= 1;
      });
    return () => {
      latest.current += 1;
    };
  }, []);

  async function loadMore() {
    if (!rows || loadingMore || busy !== null || firstPagePending.current > 0) return;
    setLoadingMore(true);
    try {
      await fetchPage(rows.length);
    } finally {
      setLoadingMore(false);
    }
  }

  async function act(id: string, run: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    latest.current += 1;
    try {
      await run();
      await fetchPage(0);
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
      await articlesApi.setMyByline({ display_name: byline.name, profile_url: byline.url }, me.uid);
      await onMeChanged();
      await fetchPage(0);
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
          <button
            className={button}
            onClick={() => setByline({ name: me.display_name ?? "", url: me.profile_url ?? "" })}
          >
            署名與作者網址
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <input
              className={`${input} w-48`}
              value={byline.name}
              maxLength={40}
              placeholder="署名"
              aria-label="署名"
              disabled={busy === "byline"}
              onChange={(e) => {
                const name = e.target.value;
                setByline((b) => (b ? { ...b, name } : b));
              }}
            />
            <input
              className={`${input} w-80`}
              type="text"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={byline.url}
              maxLength={300}
              placeholder="作者網址（選填，例如 https://www.instagram.com/你的帳號）"
              aria-label="作者網址"
              disabled={busy === "byline"}
              onChange={(e) => {
                const url = e.target.value;
                setByline((b) => (b ? { ...b, url } : b));
              }}
            />
            <button
              className={button}
              disabled={busy === "byline" || byline.name.trim() === ""}
              onClick={() => void saveByline()}
            >
              儲存
            </button>
            {/* 存檔中整個表單鎖住：送出後才改的字，回來時會跟著表單一起關掉。 */}
            <button className={button} disabled={busy === "byline"} onClick={() => setByline(null)}>
              取消
            </button>
            <span className="basis-full text-xs opacity-60">
              填了網址，網站和 App 上的署名會變成藍色連結，讀者點了就連過去。留空就是純文字。
            </span>
          </span>
        )}
        <button className={`${button} ml-auto`} onClick={() => void fetchPage(0)}>
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
                      onClick={() => void act(row.id, () => articlesApi.setStatus(row.id, "draft", me.uid))}
                    >
                      撤回
                    </button>
                  ) : (
                    <button
                      className={primary}
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => articlesApi.setStatus(row.id, "published", me.uid))}
                    >
                      發布
                    </button>
                  )}
                  {me.role === "admin" && row.status === "published" && (
                    <button
                      className={row.hidden ? button : danger}
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => articlesApi.setHidden(row.id, !row.hidden, me.uid))}
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
                            void act(row.id, () => articlesApi.remove(row.id, me.uid));
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
      {rows && hasMore && (
        <button className={button} disabled={loadingMore || busy !== null} onClick={() => void loadMore()}>
          {loadingMore ? "載入中…" : "載入更多"}
        </button>
      )}
    </div>
  );
}
