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

      {/* key={uid}:換帳號要把載入過的東西整個丟掉。這些分頁把檢舉內容、
          申請、使用者檔案留在 React state 裡,而登出再用另一個帳號登入
          並不會換掉元件實例——沒有這個 key 的話,新帳號會繼續看到上一個
          管理員的資料。寫入會被伺服器擋下,但看到本身就已經是外洩。 */}
      <div key={uid}>
        {tab === "reports" && <ReportsTab />}
        {tab === "badges" && <BadgesTab />}
        {tab === "user" && <UserTab />}
      </div>
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

// 佇列的一列 = 一個待決定的目標,不是一筆檢舉。A2 匯入帶進來的 1,113 筆
// 舊檢舉只落在 594 篇貼文上,最多的一篇被檢舉 18 次——以檢舉為單位的話,
// 那篇會在清單上排 18 次,而它只需要一個判斷。
//
// 處置成功之後直接把那一列從畫面上拿掉,不重新抓整份。積案有 594 個目標,
// 每處理一件就重抓一次會把捲動位置扔掉,而且上一輪的回應晚一步回來時會把
// 剛處理完的那列畫回去。
//
// 代價是要自己算 offset,而且不能拿畫面上的列數去算。伺服器的佇列會隨著
// 處置縮短:拿了 1–50、結案掉第 1 筆之後,原本的第 51 筆在伺服器那邊已經
// 移到第 50 個位置,再要 offset 50 就會從第 52 筆開始——第 51 筆整個 session
// 都不會再出現。所以這裡分開記兩個數:伺服器總共給過幾列(served,只增),
// 以及其中有幾列已經被處置掉(closed)。下一頁的位置永遠是兩者相減。
function ReportsTab() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [served, setServed] = useState(0);
  const [closed, setClosed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 封禁只寫 identity.bans,不會動到檢舉,所以那一列還留在佇列上——內容本身
  // 還沒被處置。記在這裡是為了讓畫面說出「已經封了」,否則同一個作者在佇列
  // 上有好幾篇時,會看不出剛才那次封禁有沒有成功。
  const [banned, setBanned] = useState<Set<string>>(new Set());

  const offset = served - closed;

  const fetchPage = useCallback(async (from: number) => {
    setLoading(true);
    try {
      const items = await admin.reports("open", from);
      setRows((prev) => (from === 0 || !prev ? items : [...prev, ...items]));
      // from === 0 是重新開始,不是接續:StrictMode 會把掛載時的 effect 跑兩次,
      // 用累加的話 served 會變成兩倍。
      setServed((n) => (from === 0 ? items.length : n + items.length));
      if (from === 0) setClosed(0);
      // 空的一頁代表伺服器那邊就到這個位置為止。把 total 收到這裡,自動載入
      // 才不會對著一個永遠成立的條件一直打。
      setTotal(items.length > 0 ? items[0].total_targets : from);
      setError(null);
    } catch (err) {
      if (from === 0) setRows([]);
      setError(err instanceof AdminRequestError ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(0);
  }, [fetchPage]);

  // 這一頁處理完但積案還沒完的時候,自動把下一頁接上。少了這個,清掉前 50 個
  // 目標之後畫面會變成「沒有待處理的檢舉」,而後面還有好幾百個。
  useEffect(() => {
    if (rows && rows.length === 0 && offset < total && !loading) {
      void fetchPage(offset);
    }
  }, [rows, offset, total, loading, fetchPage]);

  // resolves = 這個動作會不會把目標移出佇列。封禁不會:它處置的是人,不是
  // 這篇內容,內容的判斷還沒下。
  async function act(key: string, fn: () => Promise<unknown>, resolves = true) {
    setBusy(key);
    try {
      await fn();
      if (resolves) {
        // 只有成功才把它拿掉。失敗的話那件事還沒處理完,不該從眼前消失。
        setRows((prev) => prev?.filter((r) => targetKey(r) !== key) ?? prev);
        setClosed((n) => n + 1);
        setTotal((n) => Math.max(0, n - 1));
      }
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  if (error && !rows?.length) return <p className="text-sm text-[var(--val-red)]">{error}</p>;
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  // 「沒有待處理的檢舉」只有在總數真的是 0 的時候才成立。畫面上是空的但
  // 後面還有,那是「這一頁做完了」,不是「做完了」。
  if (rows.length === 0 && total === 0) {
    return <p className="text-sm opacity-60">沒有待處理的檢舉。</p>;
  }

  return (
    <>
      <p className="text-xs opacity-60 mb-3">
        {total} 個待處理目標，已載入 {rows.length}
      </p>
      <ul className="space-y-3">
        {rows.map((r) => {
          const key = targetKey(r);
          const authorBanned = r.author_id !== null && banned.has(r.author_id);
          return (
            <li key={key} className={panel}>
              <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
                <span>{r.target_kind === "post" ? "貼文" : "留言"}</span>
                <span>·</span>
                <span className="text-[var(--val-red)]">
                  {r.open_reports} 筆待處理檢舉
                </span>
                {r.report_count > r.open_reports && <span>· 累計 {r.report_count} 次</span>}
                <span>·</span>
                <span>最近 {timeAgo(r.last_reported_at)}</span>
                {r.open_reports > 1 && <span>· 最早 {timeAgo(r.first_reported_at)}</span>}
                {r.author_prior_actions > 0 && (
                  <span className="text-[var(--gold)]">
                    · 作者前科 {r.author_prior_actions} 次
                  </span>
                )}
                {r.is_hidden && <span className="text-[var(--val-red)]">· 已下架</span>}
                {authorBanned && <span className="text-[var(--val-red)]">· 作者已封禁</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap mb-2">{r.body ?? "（內容已不存在）"}</p>
              <p className="text-xs opacity-60 mb-3">
                作者：{r.author_name ?? (r.legacy_ck_user ? "尚未認領的舊帳號" : "未知")}
                {r.reasons.length > 0 && ` · 檢舉理由：${r.reasons.join("、")}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={busy === key}
                  onClick={() =>
                    act(key, async () => {
                      // 下架本身就會把未處理的檢舉標成 actioned（RPC 做的,
                      // 因為佇列讀的是檢舉狀態,不然下架完它還會排在上面）。
                      // 恢復顯示則是另一個判斷:「這則沒問題」,所以要明講
                      // 結案,伺服器刻意不在恢復時反向重開已經看過的檢舉。
                      await admin.setHidden(r.target_kind, r.target_id, !r.is_hidden);
                      if (r.is_hidden) {
                        await admin.resolveTarget(r.target_kind, r.target_id, "dismissed");
                      }
                    })
                  }
                >
                  {r.is_hidden ? "恢復並結案" : "下架並結案"}
                </button>
                <button
                  className={danger}
                  disabled={busy === key}
                  onClick={() => {
                    // 刪除不可逆,所以理由是必填,而且要當著人的面填。
                    const why = prompt("刪除理由（會留在審核軌跡裡）");
                    if (!why?.trim()) return;
                    // 刪掉內容的同時,那些檢舉也一起沒了(reports.target_id
                    // 沒有外鍵,靠 tombstone 觸發器帶走,不然審核台會留下
                    // 點不開的案件)。所以這裡**不能**再結案一次。
                    void act(key, () =>
                      admin.deleteContent(r.target_kind, r.target_id, why));
                  }}
                >
                  刪除
                </button>
                <button
                  className={button}
                  disabled={busy === key}
                  onClick={() =>
                    act(key, () =>
                      admin.resolveTarget(r.target_kind, r.target_id, "dismissed"))
                  }
                >
                  沒問題，結案
                </button>
                {r.author_id && (
                  <button
                    className={danger}
                    disabled={busy === key || authorBanned}
                    onClick={() => {
                      const why = prompt("封禁理由");
                      if (!why?.trim()) return;
                      const uid = r.author_id!;
                      // resolves=false:封禁不會關掉任何檢舉,這篇內容要下架、
                      // 刪除還是放過仍然沒有決定。把它從畫面上拿掉會讓一件
                      // 沒做完的事看起來做完了,而且重新整理之後它又回來。
                      void act(
                        key,
                        async () => {
                          await admin.ban(uid, why, null);
                          setBanned((prev) => new Set(prev).add(uid));
                        },
                        false
                      );
                    }}
                  >
                    {authorBanned ? "作者已封禁" : "永久封禁作者"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {offset < total && (
        <button
          className={`${button} mt-4`}
          disabled={loading}
          onClick={() => void fetchPage(offset)}
        >
          {loading ? "載入中…" : `載入更多（還有 ${total - offset}）`}
        </button>
      )}
      {error && <p className="text-sm text-[var(--val-red)] mt-3">{error}</p>}
    </>
  );
}

function targetKey(r: ReportRow): string {
  return `${r.target_kind}:${r.target_id}`;
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
