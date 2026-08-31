"use client";

// 後台。四件事:看檢舉、處置內容、封禁、審藍勾勾——正好取代 CloudKit
// Dashboard 在切換當下會消失的能力。
//
// 這個元件不判斷任何權限。它就是登入、打 API、把回來的東西畫出來;404
// 就顯示「找不到」,不去區分「路徑不存在」與「你不是管理員」,因為伺服器
// 刻意讓這兩件事長得一樣。

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/esports/supabase-client";
import { SUPABASE_URL } from "@/lib/esports/constants";
import { runAppleSignIn, AppleSignInCancelled } from "@/lib/esports/apple-signin";
import { signInWithAppleIdToken } from "@/lib/esports/rating-service";
import {
  admin,
  AdminRequestError,
  type BadgeRow,
  type ReportRow,
  type UserDetail,
} from "@/lib/admin/client";

type Tab = "reports" | "badges" | "user";

// 只有當網站指向本機 Supabase 時才成立。正式站是 https://api.dailyval.com，
// 所以下面那個密碼登入的分支在正式環境永遠走不到。
//
// 存在的理由：Apple 登入沒辦法指向 localhost，而手動把 session 塞進
// localStorage 需要猜 supabase-js 的 storage key 和它存的形狀——猜錯就是
// 「貼了、重新整理、什麼都沒有」。讓函式庫自己寫那一格，就不會錯。
const LOCAL_DEV =
  SUPABASE_URL.startsWith("http://127.0.0.1") ||
  SUPABASE_URL.startsWith("http://localhost");

const panel =
  "border border-[var(--border-dim)] bg-[var(--bg-panel)] rounded-lg p-4";
const button =
  "px-3 py-1.5 rounded border border-[var(--border-med)] text-sm " +
  "hover:bg-[var(--bg-panel-hover)] disabled:opacity-40 disabled:cursor-not-allowed";
const danger = `${button} border-[var(--val-red)] text-[var(--val-red)]`;
const input =
  "w-full bg-[var(--bg-elevated)] border border-[var(--border-dim)] rounded " +
  "px-2 py-1.5 text-sm";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${mins} 分鐘前`;
  if (mins < 1440) return `${Math.floor(mins / 60)} 小時前`;
  return `${Math.floor(mins / 1440)} 天前`;
}

export default function AdminConsole() {
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("reports");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setUid(data.session?.user.id ?? null);
        setReady(true);
      });
    const { data: sub } = getSupabase().auth.onAuthStateChange((_e, session) => {
      setUid(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    try {
      const { idToken, rawNonce } = await runAppleSignIn();
      const state = await signInWithAppleIdToken(idToken, rawNonce);
      setUid(state.uid);
    } catch (err) {
      if (err instanceof AppleSignInCancelled) return;
      setNotice(err instanceof Error ? err.message : "登入失敗");
    }
  }, []);

  if (!ready) return <p className="p-8 text-sm opacity-60">載入中…</p>;

  if (!uid) {
    return (
      <div className="p-8 max-w-md">
        <h1 className="text-xl font-[family-name:var(--font-display)] mb-4">後台</h1>
        <button className={button} onClick={signIn}>
          使用 Apple 登入
        </button>
        {/* 指到哪個後端要看得見。本機測試最容易的壞法就是 .env.local 沒生效、
            於是安靜地連上正式庫,而症狀是「登入了卻什麼都沒有」。 */}
        <p className="mt-3 text-xs opacity-50">後端：{SUPABASE_URL}</p>
        {LOCAL_DEV && <LocalSignIn onError={setNotice} />}
        {notice && <p className="mt-3 text-sm text-[var(--val-red)]">{notice}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-[family-name:var(--font-display)]">後台</h1>
        <nav className="flex gap-2">
          {(
            [
              ["reports", "檢舉"],
              ["badges", "藍勾勾"],
              ["user", "查使用者"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={`${button} ${tab === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className={`${button} ml-auto`}
          onClick={() => void getSupabase().auth.signOut()}
        >
          登出
        </button>
      </header>

      {tab === "reports" && <ReportsTab />}
      {tab === "badges" && <BadgesTab />}
      {tab === "user" && <UserTab />}
    </div>
  );
}

/** 本機用的密碼登入。帳號密碼由 scripts/seed-admin-local.mjs 建立。 */
function LocalSignIn({ onError }: { onError: (m: string) => void }) {
  const [email, setEmail] = useState("admin@example.test");
  const [password, setPassword] = useState("local-admin-pw-123");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) onError(`本機登入失敗：${error.message}`);
  }

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border-dim)] space-y-2">
      <p className="text-xs opacity-60">本機環境。帳密由 seed-admin-local.mjs 建立。</p>
      <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className={input}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className={button} disabled={busy} onClick={() => void go()}>
        本機登入
      </button>
    </div>
  );
}

/** 每個分頁共用的載入外殼。404 = 不是管理員,不解釋。 */
function useQueue<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // alive 柵欄:處置完會馬上 refresh,而上一輪的回應可能晚一步回來。
  // 沒有它的話,剛結案的那一列會被舊回應畫回畫面上。
  useEffect(() => {
    let alive = true;
    load()
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setItems([]);
        setError(err instanceof AdminRequestError ? err.message : "載入失敗");
      });
    return () => {
      alive = false;
    };
  }, [load, tick]);

  return { items, error, refresh };
}

function ReportsTab() {
  const load = useCallback(() => admin.reports("open"), []);
  const { items, error, refresh } = useQueue<ReportRow>(load);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      refresh();
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-sm text-[var(--val-red)]">{error}</p>;
  if (!items) return <p className="text-sm opacity-60">載入中…</p>;
  if (items.length === 0) return <p className="text-sm opacity-60">沒有待處理的檢舉。</p>;

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.report_id} className={panel}>
          <div className="flex items-baseline gap-2 text-xs opacity-70 mb-2">
            <span>{r.target_kind === "post" ? "貼文" : "留言"}</span>
            <span>·</span>
            <span>{timeAgo(r.reported_at)}被檢舉</span>
            <span>·</span>
            <span>累計 {r.report_count} 次檢舉</span>
            {r.author_prior_actions > 0 && (
              <span className="text-[var(--gold)]">
                · 作者前科 {r.author_prior_actions} 次
              </span>
            )}
            {r.is_hidden && <span className="text-[var(--val-red)]">· 已下架</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap mb-2">{r.body ?? "（內容已不存在）"}</p>
          <p className="text-xs opacity-60 mb-3">
            作者：{r.author_name ?? (r.legacy_ck_user ? "尚未認領的舊帳號" : "未知")}
            {r.report_reason && ` · 檢舉理由：${r.report_reason}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy === r.report_id}
              onClick={() =>
                act(r.report_id, async () => {
                  await admin.setHidden(r.target_kind, r.target_id, !r.is_hidden);
                  await admin.resolveReport(r.report_id, "actioned");
                })
              }
            >
              {r.is_hidden ? "恢復並結案" : "下架並結案"}
            </button>
            <button
              className={danger}
              disabled={busy === r.report_id}
              onClick={() => {
                // 刪除不可逆,所以理由是必填,而且要當著人的面填。
                const why = prompt("刪除理由（會留在審核軌跡裡）");
                if (!why?.trim()) return;
                void act(r.report_id, async () => {
                  await admin.deleteContent(r.target_kind, r.target_id, why);
                  await admin.resolveReport(r.report_id, "actioned", why);
                });
              }}
            >
              刪除
            </button>
            <button
              className={button}
              disabled={busy === r.report_id}
              onClick={() => act(r.report_id, () => admin.resolveReport(r.report_id, "dismissed"))}
            >
              沒問題，結案
            </button>
            {r.author_id && (
              <button
                className={danger}
                disabled={busy === r.report_id}
                onClick={() => {
                  const why = prompt("封禁理由");
                  if (!why?.trim()) return;
                  void act(r.report_id, () => admin.ban(r.author_id!, why, null));
                }}
              >
                永久封禁作者
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BadgesTab() {
  const load = useCallback(() => admin.badges("pending"), []);
  const { items, error, refresh } = useQueue<BadgeRow>(load);

  async function review(id: string, approve: boolean) {
    const note = prompt(approve ? "備註（可空白）" : "退回理由");
    if (!approve && !note?.trim()) return;
    try {
      await admin.reviewBadge(id, approve, note ?? undefined);
      refresh();
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    }
  }

  if (error) return <p className="text-sm text-[var(--val-red)]">{error}</p>;
  if (!items) return <p className="text-sm opacity-60">載入中…</p>;
  if (items.length === 0) return <p className="text-sm opacity-60">沒有待審的申請。</p>;

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.application_id} className={panel}>
          <div className="flex items-baseline gap-2 mb-2">
            <strong className="text-sm">{a.nickname}</strong>
            <span className="text-xs opacity-60">
              {a.display_name ?? "（沒有暱稱）"} · {timeAgo(a.created_at)}申請
            </span>
          </div>
          {a.intro && <p className="text-sm mb-2 whitespace-pre-wrap">{a.intro}</p>}
          {a.more_info && <p className="text-xs opacity-70 mb-2">{a.more_info}</p>}
          {a.links.length > 0 && (
            <ul className="text-xs mb-3 space-y-0.5">
              {a.links.map((l) => (
                <li key={l}>
                  <a
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[var(--jett-blue)] underline break-all"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button className={button} onClick={() => void review(a.application_id, true)}>
              通過
            </button>
            <button className={danger} onClick={() => void review(a.application_id, false)}>
              退回
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function UserTab() {
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function look() {
    setError(null);
    setDetail(null);
    try {
      setDetail(await admin.user(query.trim()));
    } catch (err) {
      setError(err instanceof AdminRequestError ? err.message : "查詢失敗");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className={input}
          placeholder="使用者 uuid"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={button} onClick={() => void look()}>
          查詢
        </button>
      </div>
      {error && <p className="text-sm text-[var(--val-red)]">{error}</p>}
      {detail && (
        <div className={panel}>
          <p className="text-sm mb-2">
            <strong>{detail.display_name ?? "（沒有暱稱）"}</strong>
            {detail.is_verified && <span className="text-[var(--jett-blue)]"> · 已認證</span>}
            {detail.is_premium && <span className="text-[var(--gold)]"> · Premium</span>}
          </p>
          <p className="text-xs opacity-70 mb-3">
            貼文 {detail.posts} · 留言 {detail.comments} · 被檢舉{" "}
            {detail.reports_against} · 被處置 {detail.actions_against}
          </p>
          {detail.banned ? (
            <div>
              <p className="text-sm text-[var(--val-red)] mb-2">
                封禁中：{detail.ban_reason ?? "（沒寫理由）"}
                {detail.ban_expires_at
                  ? ` · 到 ${new Date(detail.ban_expires_at).toLocaleString()}`
                  : " · 永久"}
              </p>
              <button
                className={button}
                onClick={() =>
                  void admin.liftBan(detail.user_id).then(look).catch(() => setError("解禁失敗"))
                }
              >
                解除封禁
              </button>
            </div>
          ) : (
            <button
              className={danger}
              onClick={() => {
                const why = prompt("封禁理由");
                if (!why?.trim()) return;
                void admin
                  .ban(detail.user_id, why, null)
                  .then(look)
                  .catch(() => setError("封禁失敗"));
              }}
            >
              永久封禁
            </button>
          )}
        </div>
      )}
    </div>
  );
}
