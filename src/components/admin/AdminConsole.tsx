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
import { contentSummary } from "./contentSummary";
import { usePagedQueue } from "./usePagedQueue";
import {
  admin,
  AdminRequestError,
  imageURL,
  type ActionRow,
  type ContentImage,
  type BadgeRow,
  type ReportRow,
  type UserDetail,
} from "@/lib/admin/client";

type Tab = "reports" | "badges" | "history" | "user";

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
              ["history", "處置紀錄"],
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
        {tab === "history" && <HistoryTab />}
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

// 被檢舉的常常不是文字。縮圖排成一列,點下去在新分頁開原圖——判斷有時候
// 得看細節,而 400px 的縮圖是用來掃過一遍的,不是用來下判斷的。
function ImageStrip({ images }: { images: ContentImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {images.map((img) => (
        <a
          key={img.key}
          href={imageURL(img.key)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title="開啟原圖"
          className="block"
        >
          {/* next/image 需要在設定裡登記網域,而這裡是一個內部工具、
              圖片數量固定又小,用 img 反而少一層需要維護的設定。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageURL(img.thumb)}
            alt=""
            loading="lazy"
            className="h-32 w-32 object-cover rounded border border-[var(--border)] bg-[var(--bg-panel-hover)]"
          />
        </a>
      ))}
    </div>
  );
}

const REPORT_FILTERS = [
  ["open", "待處理"],
  ["actioned", "已處置"],
  ["dismissed", "已忽略"],
  ["all", "全部"],
] as const;

function ReportsTab() {
  const [status, setStatus] = useState<string>("open");
  const [busy, setBusy] = useState<string | null>(null);
  // 封禁只寫 identity.bans,不會動到檢舉,所以那一列還留在佇列上——內容本身
  // 還沒被處置。記在這裡是為了讓畫面說出「已經封了」,否則同一個作者在佇列
  // 上有好幾篇時,會看不出剛才那次封禁有沒有成功。
  const [banned, setBanned] = useState<Set<string>>(new Set());

  const fetchPage = useCallback((o: number) => admin.reports(status, o), [status]);
  const totalOf = useCallback(
    (items: ReportRow[], from: number) =>
      items.length > 0 ? items[0].total_targets : from,
    []
  );
  const { rows, total, offset, loading, error, load, remove, datasetToken } =
    usePagedQueue<ReportRow>({ fetchPage, totalOf, keyOf: targetKey, resetKey: status });

  // resolves = 這個動作會不會把目標移出佇列。封禁不會:它處置的是人,不是
  // 這篇內容,內容的判斷還沒下。
  async function act(key: string, fn: () => Promise<unknown>, resolves = true) {
    // 動作開始時的資料集,交給 remove 判斷它回來的時候還算不算數。
    const token = datasetToken();
    setBusy(key);
    try {
      await fn();
      // 只有成功才把它拿掉。失敗的話那件事還沒處理完,不該從眼前消失。
      if (resolves) remove(key, token);
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  const filters = (
    <div className="flex flex-wrap items-baseline gap-2 mb-3">
      {REPORT_FILTERS.map(([key, label]) => (
        <button
          key={key}
          className={`${button} text-xs ${status === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
          onClick={() => setStatus(key)}
        >
          {label}
        </button>
      ))}
      {rows && (
        <span className="text-xs opacity-60 ml-1">
          {total} 個目標，已載入 {rows.length}
        </span>
      )}
    </div>
  );

  if (error && !rows?.length) {
    return (
      <>
        {filters}
        <p className="text-sm text-[var(--val-red)]">{error}</p>
      </>
    );
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  // 「沒有」只有在總數真的是 0 的時候才成立。畫面上是空的但後面還有,那是
  // 「這一頁做完了」,不是「做完了」。
  if (rows.length === 0 && total === 0) {
    return (
      <>
        {filters}
        <p className="text-sm opacity-60">
          {status === "open" ? "沒有待處理的檢舉。" : "這個狀態下沒有案件。"}
        </p>
      </>
    );
  }

  return (
    <>
      {filters}
      <ul className="space-y-3">
        {rows.map((r) => {
          const key = targetKey(r);
          const authorBanned = r.author_id !== null && banned.has(r.author_id);
          const open = status === "open";
          return (
            <li key={key} className={panel}>
              <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
                <span>{r.target_kind === "post" ? "貼文" : "留言"}</span>
                <span>·</span>
                <span className={open ? "text-[var(--val-red)]" : ""}>
                  {r.open_reports} 筆檢舉
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
              {contentSummary(r) === null ? (
                <p className="text-sm whitespace-pre-wrap mb-2">{r.body}</p>
              ) : (
                <p className="text-sm opacity-60 mb-2">{contentSummary(r)}</p>
              )}
              <ImageStrip images={r.images} />
              <p className="text-xs opacity-60 mb-3">
                作者：{r.author_name ?? (r.legacy_ck_user ? "尚未認領的舊帳號" : "未知")}
                {r.reasons.length > 0 && ` · 檢舉理由：${r.reasons.join("、")}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={busy === key}
                  onClick={() =>
                    act(
                      key,
                      async () => {
                      // 下架本身就會把未處理的檢舉標成 actioned（RPC 做的,
                      // 因為佇列讀的是檢舉狀態,不然下架完它還會排在上面）。
                      // 恢復顯示則是另一個判斷:「這則沒問題」,所以要明講
                      // 結案,伺服器刻意不在恢復時反向重開已經看過的檢舉。
                      await admin.setHidden(r.target_kind, r.target_id, !r.is_hidden);
                      if (r.is_hidden) {
                        await admin.resolveTarget(r.target_kind, r.target_id, "dismissed");
                      }
                      },
                      // 下架/恢復改的是檢舉狀態,所以只有在「待處理」這個
                      // 篩選底下,這一列才真的離開伺服器的資料集。在「已處置」
                      // 或「全部」底下它還在,把它當成離開了會讓 offset 少算
                      // 一格,下一頁就會重複。
                      open
                    )
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
                {open && (
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
                )}
                {r.author_id && (
                  <button
                    className={danger}
                    disabled={busy === key || authorBanned}
                    onClick={() => {
                      const why = prompt("封禁理由");
                      if (!why?.trim()) return;
                      const uid = r.author_id!;
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
          onClick={() => void load(offset)}
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

const BADGE_FILTERS = [
  ["pending", "待審"],
  ["approved", "已通過"],
  ["rejected", "已退回"],
  ["all", "全部"],
] as const;

function BadgesTab() {
  const [status, setStatus] = useState<string>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPage = useCallback((o: number) => admin.badges(status, o), [status]);
  const totalOf = useCallback(
    (items: BadgeRow[], from: number) =>
      items.length > 0 ? items[0].total_applicants : from,
    []
  );
  const keyOf = useCallback((a: BadgeRow) => a.application_id, []);
  const { rows, total, offset, loading, error, load, remove, datasetToken } =
    usePagedQueue<BadgeRow>({ fetchPage, totalOf, keyOf, resetKey: status });

  async function review(a: BadgeRow, approve: boolean) {
    const note = prompt(approve ? "備註（可空白）" : "退回理由");
    if (!approve && !note?.trim()) return;
    const token = datasetToken();
    setBusy(a.application_id);
    try {
      await admin.reviewBadge(a.application_id, approve, note ?? undefined);
      remove(a.application_id, token);
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  const filters = (
    <div className="flex flex-wrap items-baseline gap-2 mb-3">
      {BADGE_FILTERS.map(([key, label]) => (
        <button
          key={key}
          className={`${button} text-xs ${status === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
          onClick={() => setStatus(key)}
        >
          {label}
        </button>
      ))}
      {rows && (
        <span className="text-xs opacity-60 ml-1">
          {total} 位申請人，已載入 {rows.length}
        </span>
      )}
    </div>
  );

  if (error && !rows?.length) {
    return (
      <>
        {filters}
        <p className="text-sm text-[var(--val-red)]">{error}</p>
      </>
    );
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0 && total === 0) {
    return (
      <>
        {filters}
        <p className="text-sm opacity-60">
          {status === "pending" ? "沒有待審的申請。" : "這個狀態下沒有申請。"}
        </p>
      </>
    );
  }

  return (
    <>
      {filters}
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.application_id} className={panel}>
            <div className="flex flex-wrap items-baseline gap-2 mb-2">
              <strong className="text-sm">{a.nickname}</strong>
              <span className="text-xs opacity-60">
                {a.display_name ?? (a.legacy_ck_user ? "尚未認領的舊帳號" : "（沒有暱稱）")}
                {" · "}
                {timeAgo(a.created_at)}申請
              </span>
              {a.application_count > 1 && (
                <span className="text-xs opacity-60">· 共 {a.application_count} 份</span>
              )}
              {a.is_verified && <span className="text-xs text-[var(--gold)]">· 已有勾勾</span>}
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
            {a.review_note && (
              <p className="text-xs opacity-60 mb-2">審核備註：{a.review_note}</p>
            )}
            {status === "pending" && (
              <>
                {a.legacy_ck_user && (
                  // 誠實地講清楚:舊申請沒有帳號可以掛勾勾,通過只是把決定記
                  // 下來,要等這個人認領那個 CloudKit 身分之後才會生效。
                  <p className="text-xs opacity-60 mb-2">
                    這是 CloudKit 時代的申請。通過會記下決定，但要等這個人認領帳號之後才會真的掛上勾勾。
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    className={button}
                    disabled={busy === a.application_id}
                    onClick={() => void review(a, true)}
                  >
                    通過{a.application_count > 1 ? `（${a.application_count} 份一起）` : ""}
                  </button>
                  <button
                    className={danger}
                    disabled={busy === a.application_id}
                    onClick={() => void review(a, false)}
                  >
                    退回
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {offset < total && (
        <button
          className={`${button} mt-4`}
          disabled={loading}
          onClick={() => void load(offset)}
        >
          {loading ? "載入中…" : `載入更多（還有 ${total - offset}）`}
        </button>
      )}
      {error && <p className="text-sm text-[var(--val-red)] mt-3">{error}</p>}
    </>
  );
}

// 審核軌跡。這是「我做過什麼」唯一看得到的地方——尤其是刪除,那是唯一一種
// 處置完之後,被處置的東西就不在了的操作。
const ACTION_LABELS: Record<string, string> = {
  hide: "下架",
  unhide: "恢復顯示",
  delete: "刪除",
  ban: "封禁",
  lift_ban: "解除封禁",
  "report:actioned": "檢舉結案（已處置）",
  "report:dismissed": "檢舉結案（沒問題）",
  "report:open": "重開檢舉",
};

function HistoryTab() {
  const fetchPage = useCallback((o: number) => admin.actions(o), []);
  const totalOf = useCallback(
    (items: ActionRow[], from: number) =>
      items.length > 0 ? items[0].total_actions : from,
    []
  );
  const keyOf = useCallback((a: ActionRow) => a.action_id, []);
  const { rows, total, offset, loading, error, load } =
    usePagedQueue<ActionRow>({ fetchPage, totalOf, keyOf });

  if (error && !rows?.length) return <p className="text-sm text-[var(--val-red)]">{error}</p>;
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0) return <p className="text-sm opacity-60">還沒有任何處置紀錄。</p>;

  return (
    <>
      <p className="text-xs opacity-60 mb-3">
        {total} 筆處置，已載入 {rows.length}
      </p>
      <ul className="space-y-3">
        {rows.map((a) => {
          const note = contentSummary({
            content_exists: a.content_exists,
            body: a.content_body,
            images: a.content_images,
          });
          return (
          <li key={a.action_id} className={panel}>
            <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
              <strong className="text-sm opacity-100">
                {ACTION_LABELS[a.action] ?? a.action}
              </strong>
              <span>·</span>
              <span>{a.target_kind === "post" ? "貼文" : "留言"}</span>
              <span>·</span>
              <span>{timeAgo(a.created_at)}</span>
              {a.admin_name && <span>· 由 {a.admin_name}</span>}
              {!a.content_exists && <span className="text-[var(--val-red)]">· 內容已刪除</span>}
              {a.content_exists && a.content_hidden && <span>· 目前為下架狀態</span>}
            </div>
            <p className="text-xs opacity-60 mb-1">
              對象：
              {a.subject_name ??
                (a.subject_legacy_ck_user ? "尚未認領的舊帳號" : "（未記錄）")}
            </p>
            {note === null ? (
              <p className="text-sm whitespace-pre-wrap opacity-80 mb-2">{a.content_body}</p>
            ) : (
              <p className="text-sm opacity-60 mb-2">{note}</p>
            )}
            {a.content_exists && <ImageStrip images={a.content_images} />}
            {a.reason && <p className="text-xs opacity-60 mt-1">理由：{a.reason}</p>}
          </li>
          );
        })}
      </ul>
      {offset < total && (
        <button
          className={`${button} mt-4`}
          disabled={loading}
          onClick={() => void load(offset)}
        >
          {loading ? "載入中…" : `載入更多（還有 ${total - offset}）`}
        </button>
      )}
    </>
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
