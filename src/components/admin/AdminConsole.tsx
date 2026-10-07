"use client";

// 後台。四件事:看檢舉、處置內容、封禁、審藍勾勾——正好取代 CloudKit
// Dashboard 在切換當下會消失的能力。
//
// 這個元件不判斷任何權限。它就是登入、打 API、把回來的東西畫出來;404
// 就顯示「找不到」,不去區分「路徑不存在」與「你不是管理員」,因為伺服器
// 刻意讓這兩件事長得一樣。

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/esports/supabase-client";
import { SUPABASE_URL } from "@/lib/esports/constants";
import { runAppleSignIn, AppleSignInCancelled } from "@/lib/esports/apple-signin";
import { signInWithAppleIdToken } from "@/lib/esports/rating-service";
import { SignOutFailedError, signOutCurrentSession } from "@/lib/esports/auth-session";
import { LocalSignIn } from "./AdminSession";
import { contentSummary } from "./contentSummary";
import { usePagedQueue } from "./usePagedQueue";
import {
  admin,
  AdminRequestError,
  imageURL,
  type ActionRow,
  type BadgeReason,
  type BadgeReviewRow,
  type BadgeRow,
  type BanRow,
  type ContentImage,
  type LegacyKeyKind,
  type LinkedAccount,
  type Person,
  type PersonStatus,
  type ReportQuery,
  type ReportRow,
  type UserDetail,
} from "@/lib/admin/client";
import {
  canUnhide,
  hiddenLabel,
  hideActionLabel,
  targetKindLabel,
  type TargetKind,
} from "@/lib/admin/targetKind";
import { externalHref } from "@/lib/admin/externalHref";
import {
  changeMessage,
  durationLabel,
  expiryLabel,
  GRANT_ERROR_LABELS,
  GRANT_STATUS_LABELS,
  MATCH_LABELS,
  PREMIUM_DURATIONS,
  unsettledMessage,
  type PersonHit,
  type PremiumDetail,
  type PremiumDuration,
  type PremiumGrant,
  type PremiumLogRow,
} from "@/lib/admin/premium";
import type { BadgeSort, ReportSort } from "@/lib/admin/validate";

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
          onClick={() =>
            void signOutCurrentSession().catch((err: unknown) =>
              alert(err instanceof SignOutFailedError ? err.message : "登出失敗")
            )
          }
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

// 封禁的對象：帳號，或還沒認領的舊身分的鑰匙（舊版 App 同步進來的內容沒有
// 帳號，伺服器回的 ban_key / ban_key_kind 就是要封的那一把）。都沒有就封不了。
type BanTarget = { userId: string } | { legacyKind: LegacyKeyKind; legacyKey: string };

function banTargetOf(
  userId: string | null | undefined,
  status: PersonStatus | null | undefined
): BanTarget | null {
  if (userId) return { userId };
  if (status?.ban_key && status.ban_key_kind) {
    return { legacyKind: status.ban_key_kind, legacyKey: status.ban_key };
  }
  return null;
}

function banKeyOf(t: BanTarget): string {
  return "userId" in t ? `u:${t.userId}` : `k:${t.legacyKind}:${t.legacyKey}`;
}

// 這個分頁剛封掉的人：鑰匙（banKeyOf）→ 封禁完成時的時鐘。同一個作者在畫面上
// 常常不只一列，所以記在分頁上。每一列帶著它的讀取發出時的時鐘（fetched_at）：
// 在封禁完成之前發出的讀取，伺服器說的可能還是封禁之前的事，以這裡為準；之後
// 發出的以伺服器為準（例如別的分頁已經解除了）。
let clock = 0;
const tick = () => ++clock;
type LocalBans = ReadonlyMap<string, number>;
type Fetched<T> = T & { fetched_at?: number };

function stamp<T>(items: T[], at: number): Fetched<T>[] {
  return items.map((r) => ({ ...r, fetched_at: at }));
}

function bannedHere(local: LocalBans, key: string, fetchedAt: number | undefined): boolean {
  const at = local.get(key);
  return at !== undefined && (fetchedAt ?? 0) < at;
}

// 問理由。舊身分沒有帳號，所以講清楚這個封禁會怎麼生效，免得以為他的
// 內容會一起消失。造型留言的作者鑰匙是客戶端寫的，不跟著認領走。
function askBanReason(t: BanTarget): string | null {
  const why = prompt(
    "userId" in t
      ? "封禁理由"
      : t.legacyKind === "ck_user"
        ? "封禁理由（這個作者還在用舊版 App、沒有帳號：之後從舊版同步進來的內容會直接下架，" +
          "他升級認領時新帳號一起封禁。已經在的內容不會動。）"
        : "封禁理由（造型舊留言的作者：之後從舊版同步進來、署名這把鑰匙的造型留言會直接下架。" +
          "這把鑰匙是舊版客戶端寫的，不會跟著封到任何帳號；已經在的留言不會動。）"
  );
  return why?.trim() ? why : null;
}

function sendBan(t: BanTarget, why: string): Promise<unknown> {
  return "userId" in t
    ? admin.ban(t.userId, why, null)
    : admin.banLegacy(t.legacyKind, t.legacyKey, why);
}

// 同一個 Riot 帳號在新版登入的帳號。舊系統的 puuid 是客戶端寫的、可以冒用，
// 所以伺服器只列出來，封不封由人決定。
function LinkedAccounts({
  accounts,
  bannedHere,
  busy,
  onBan,
}: {
  accounts: readonly LinkedAccount[];
  /** 這個分頁剛封掉、伺服器那一份還沒反映的帳號。 */
  bannedHere: (userId: string) => boolean;
  busy: (userId: string) => boolean;
  onBan: (userId: string) => void;
}) {
  if (accounts.length === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span>同一個 Riot 帳號在新版登入的帳號：</span>
      {accounts.map((a) => {
        const isBanned = a.banned || bannedHere(a.user_id);
        return (
          <span key={a.user_id} className="inline-flex items-baseline gap-1.5">
            <span>{a.game_name ?? a.name ?? "（沒有名字）"}</span>
            {a.game_name && a.tag_line && <span className="opacity-60">#{a.tag_line}</span>}
            {isBanned ? (
              <span className="text-[var(--val-red)]">· 封禁中</span>
            ) : (
              <button
                className={`${danger} text-xs px-2 py-0.5`}
                disabled={busy(a.user_id)}
                onClick={() => onBan(a.user_id)}
              >
                封禁這個帳號
              </button>
            )}
          </span>
        );
      })}
    </p>
  );
}

// 載入失敗、手上沒有任何列的時候。重試一律從第一頁開始：失敗之後的分頁
// 計數不可信，接著舊的 offset 拿會跳過前面的目標。
function LoadError({
  message,
  busy,
  onRetry,
}: {
  message: string;
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <p role="alert" className="text-sm text-[var(--val-red)]">
        {message}
      </p>
      <button className={`${button} text-xs`} disabled={busy} onClick={onRetry}>
        重新載入
      </button>
    </div>
  );
}

const REPORT_FILTERS = [
  ["open", "待處理"],
  ["actioned", "已處置"],
  ["dismissed", "已忽略"],
  ["all", "全部"],
] as const;

const REPORT_SORT_OPTIONS: readonly (readonly [ReportSort, string])[] = [
  ["most", "檢舉最多"],
  ["newest", "最新檢舉"],
  ["oldest", "最舊檢舉"],
];

// 貼文和造型留言是兩個不同的地方來的檢舉，混在一起排很難一口氣看完一種。
// 順序跟 enum 不同：舊的兩種在前，房間最後。"" = 全部。
const REPORT_KIND_TABS: readonly ("" | TargetKind)[] = [
  "",
  "post",
  "comment",
  "skin_comment",
  "esports_comment",
  "room",
];

// 下一頁整頁都是已經載入的目標時，最多再往後要幾次（見 ReportsTab 的 fetchPage）。
const REPEAT_PAGE_LIMIT = 200;

// export 是給測試用的：要在真的元件上重現「處置還沒回來就換篩選」。
export function ReportsTab() {
  const [status, setStatus] = useState<string>("open");
  const [sort, setSort] = useState<ReportSort>("most");
  const [kind, setKind] = useState<"" | TargetKind>("");
  const [busy, setBusy] = useState<string | null>(null);
  // 封禁只寫 identity.bans,不會動到檢舉,所以那一列還留在佇列上——內容本身
  // 還沒被處置。記在這裡是為了讓畫面說出「已經封了」,否則同一個作者在佇列
  // 上有好幾篇時,會看不出剛才那次封禁有沒有成功。見 bannedHere。
  const [banned, setBanned] = useState<LocalBans>(new Map());

  // 翻頁跟藍勾勾佇列同一套（見 BadgesTab）：後面幾頁從畫面上最後一列的排序鍵
  // 接下去，帶著第一頁定下的快照。offset 翻頁時，翻頁之間的新檢舉會把被檢舉
  // 的目標往前推（「最新檢舉」底下每一筆都會），第二頁重複一列；下一頁還在
  // 路上時處置完成，則會跳過一列。快照讓後來的檢舉不改變任何目標的檢舉數與
  // 時間，游標只看「排在誰後面」。號碼牌：換篩選時上一個篩選的第一頁可能
  // 晚回來，只有最後一次發出的第一頁可以定快照。
  const snapshot = useRef<{ ticket: number; asOf?: string }>({ ticket: 0 });
  const shownRows = useRef<ReportRow[]>([]);
  // 這個資料集裡處置掉（離開資料集）了幾列，跟「這一頁發出時是幾」。見 totalOf。
  const acted = useRef(0);
  const actedAtRequest = useRef(0);
  // 這個資料集裡處置掉的目標（key）。從頭載入就清掉。
  const actedKeys = useRef<Set<string>>(new Set());
  // 每一次真正發出的讀取各自取時鐘：整頁重複時會再要一次，那一次可能是在封禁
  // 完成之後才發出的，不能沿用第一次的時間（見 bannedHere）。
  const read = useCallback(async (q: ReportQuery) => {
    const at = tick();
    return stamp(await admin.reports(q), at);
  }, []);
  const fetchPage = useCallback(
    async (o: number) => {
      actedAtRequest.current = acted.current;
      const kinds = kind ? [kind] : [];
      if (o === 0) {
        actedKeys.current = new Set();
        const ticket = snapshot.current.ticket + 1;
        snapshot.current = { ticket };
        const items = await read({ status, offset: 0, sort, kinds });
        if (snapshot.current.ticket === ticket) {
          snapshot.current = { ticket, asOf: items[0]?.as_of };
        }
        return items;
      }
      const asOf = snapshot.current.asOf;
      let last = shownRows.current.at(-1);
      if (!last) return read({ status, offset: o, sort, kinds, asOf });
      // 同一個目標不存第二份。翻頁之間它的排序鍵可能變了（檢舉數變少、晚提交
      // 的檢舉），排到游標後面又出現；或是這一輪已經處置掉，晚到的這一頁還帶著
      // 它。分頁狀態裡一個目標只有一列，remove 才會剛好算一列。要不要丟是在
      // 回應回來的當下，照已經存著的列與處置過的目標決定。丟掉的列伺服器算在
      // remaining 裡，跟著扣掉；整頁都是重複的話，從它的最後一列再往後要。
      //
      // 往後要不設小上限：游標每次都嚴格往後走、資料集有限，一定會停。用完一個
      // 小上限就回空頁的話，hook 會當成到底了，後面沒看過的目標就不見。只留一個
      // 大的保險，到了就明講，而不是安靜地結束。
      for (let hop = 0; hop < REPEAT_PAGE_LIMIT; hop++) {
        const items = await read({
          status,
          offset: 0,
          sort,
          kinds,
          asOf,
          after: {
            open: last.open_reports,
            first: last.first_reported_at,
            last: last.last_reported_at,
            kind: last.target_kind,
            id: last.target_id,
          },
        });
        const have = new Set([...shownRows.current.map(targetKey), ...actedKeys.current]);
        const fresh = items.filter((r) => !have.has(targetKey(r)));
        if (fresh.length > 0 || items.length === 0) {
          const dropped = items.length - fresh.length;
          return dropped === 0
            ? fresh
            : fresh.map((r) => ({ ...r, remaining: r.remaining - dropped }));
        }
        last = items[items.length - 1];
      }
      throw new AdminRequestError(
        `連續 ${REPEAT_PAGE_LIMIT} 頁都是已經載入的目標，請重新載入這個篩選。`,
        0
      );
    },
    [status, sort, kind, read]
  );
  // 總數 = 現在畫面上有幾列 + 這一頁開頭起還有幾個目標。不用 total_targets：
  // 下一頁查詢之前剛處置掉的那一列，伺服器的總數已經少了它，remove 又會再
  // 減一次。「現在畫面上」= 發出時的列數（from）減掉這一頁在路上時處置掉的。
  const totalOf = useCallback((items: ReportRow[], from: number) => {
    if (items.length > 0 && typeof items[0].remaining !== "number") {
      // 資料庫還是舊版（沒有 remaining）：照舊用 total_targets，不要變成 NaN。
      return items[0].total_targets;
    }
    const since = acted.current - actedAtRequest.current;
    return from - since + (items.length > 0 ? items[0].remaining : 0);
  }, []);
  // 三個篩選任何一個變了都是換資料集：resetKey 一變，usePagedQueue 就從第一頁
  // 重新載入，而它的號碼牌會丟掉前一個選擇還在路上的回應，所以慢回來的舊請求
  // 蓋不掉新選擇的結果。種類不會因為處置而改變，所以「這一列離開了資料集」的
  // 判斷（見 act 的 resolves）在種類篩選底下一樣成立。
  const { rows, total, offset, loading, error, load, reload, remove, reconcile, datasetToken } =
    usePagedQueue<Fetched<ReportRow>>({
      fetchPage,
      totalOf,
      keyOf: targetKey,
      resetKey: `${status}|${sort}|${kind}`,
    });
  // 游標跟著畫面走（useLayoutEffect 的理由見 BadgesTab）。
  useLayoutEffect(() => {
    shownRows.current = rows ?? [];
  }, [rows]);

  // resolves = 這個動作會不會把目標移出佇列。封禁不會:它處置的是人,不是
  // 這篇內容,內容的判斷還沒下。
  async function act(key: string, fn: () => Promise<unknown>, resolves = true) {
    // 動作開始時的資料集,交給 remove / reconcile 判斷它回來的時候還算不算數。
    const token = datasetToken();
    setBusy(key);
    try {
      await fn();
      // 只有成功才把它拿掉。失敗的話那件事還沒處理完,不該從眼前消失。
      // 中途換過篩選的話，兩條路都會從第一頁重拿目前的篩選：新的那一頁
      // 可能是在這個處置寫進去之前拿的。
      if (resolves) {
        // 資料集沒換過才記：換過的話 remove 會交給 reconcile 從第一頁重拿。
        if (token === datasetToken()) {
          acted.current += 1;
          actedKeys.current.add(key);
        }
        remove(key, token);
      } else reconcile(token);
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  const chip = (active: boolean) =>
    `${button} text-xs ${active ? "bg-[var(--bg-panel-hover)]" : ""}`;
  const kindLabel = kind ? targetKindLabel(kind) : "";

  // 選中與否不能只靠底色：每一組有自己的名字，每顆按鈕用 aria-pressed 說出
  // 自己是不是目前的選擇。
  const filters = (
    <div className="space-y-2 mb-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <div role="group" aria-label="狀態" className="flex flex-wrap gap-2">
          {REPORT_FILTERS.map(([key, label]) => (
            <button
              key={key}
              className={chip(status === key)}
              aria-pressed={status === key}
              onClick={() => setStatus(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {rows && (
          <span className="text-xs opacity-60 ml-1">
            {kindLabel && `${kindLabel} `}
            {total} 個目標，已載入 {rows.length}
          </span>
        )}
      </div>
      <div role="group" aria-label="種類" className="flex flex-wrap items-baseline gap-2">
        {REPORT_KIND_TABS.map((k) => (
          <button
            key={k || "all"}
            className={chip(kind === k)}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {k ? targetKindLabel(k) : "全部"}
          </button>
        ))}
      </div>
      <div role="group" aria-label="排序" className="flex flex-wrap items-baseline gap-2">
        {/* 組名已經是「排序」，這個字只給眼睛看，不要唸兩次。 */}
        <span aria-hidden="true" className="text-xs opacity-60">
          排序：
        </span>
        {REPORT_SORT_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            className={chip(sort === key)}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  if (error && !rows?.length) {
    return (
      <>
        {filters}
        <LoadError message={error} busy={loading} onRetry={reload} />
      </>
    );
  }
  // 篩選列在載入中也留著：換一個選擇就要等一次，那段時間不該連按鈕都消失。
  if (!rows) {
    return (
      <>
        {filters}
        <p className="text-sm opacity-60">載入中…</p>
      </>
    );
  }
  // 「沒有」只有在總數真的是 0 的時候才成立。畫面上是空的但後面還有,那是
  // 「這一頁做完了」,不是「做完了」。
  if (rows.length === 0 && total === 0) {
    return (
      <>
        {filters}
        <p className="text-sm opacity-60">
          {status === "open"
            ? `沒有待處理的${kindLabel}檢舉。`
            : kindLabel
              ? `這個狀態下沒有${kindLabel}的案件。`
              : "這個狀態下沒有案件。"}
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
          // 認領過的封帳號；舊版同步進來的封舊鑰匙（伺服器給的 ban_key）。
          const banTarget = banTargetOf(r.author_id, r.author_status);
          const authorBanned =
            (r.author_status?.banned ?? false) ||
            (banTarget !== null && bannedHere(banned, banKeyOf(banTarget), r.fetched_at));
          const banAuthor = (t: BanTarget) => {
            const why = askBanReason(t);
            if (!why) return;
            void act(
              key,
              async () => {
                await sendBan(t, why);
                const at = tick();
                setBanned((prev) => new Map(prev).set(banKeyOf(t), at));
              },
              false
            );
          };
          const open = status === "open";
          return (
            <li key={key} className={panel}>
              <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
                <span>{targetKindLabel(r.target_kind)}</span>
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
                {r.is_hidden && (
                  <span className="text-[var(--val-red)]">· {hiddenLabel(r.target_kind)}</span>
                )}
                {authorBanned && <span className="text-[var(--val-red)]">· 作者已封禁</span>}
              </div>
              {contentSummary(r) === null ? (
                <p className="text-sm whitespace-pre-wrap mb-2">{r.body}</p>
              ) : (
                <p className="text-sm opacity-60 mb-2">{contentSummary(r)}</p>
              )}
              <ImageStrip images={r.images} />
              <div className="text-xs opacity-60 mb-3 space-y-1">
                <p>
                  作者：<PersonBadge person={r.author} />
                  {!r.author.claimed && (r.legacy_ck_user || r.author_status?.ban_key) && (
                    <span className="opacity-60"> · 尚未認領</span>
                  )}
                  {authorBanned && r.author_status?.ban_reason && (
                    <span className="opacity-60"> · 封禁理由：{r.author_status.ban_reason}</span>
                  )}
                </p>
                {!r.author.claimed && (
                  <LinkedAccounts
                    accounts={r.author_status?.accounts ?? []}
                    bannedHere={(userId) =>
                      bannedHere(banned, banKeyOf({ userId }), r.fetched_at)
                    }
                    busy={() => busy === key}
                    onBan={(userId) => banAuthor({ userId })}
                  />
                )}
                {r.reporters.length > 0 && (
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span>檢舉人：</span>
                    {r.reporters.map((p, i) => (
                      <span key={p.puuid ?? p.user_id ?? i}>
                        <PersonBadge person={p} muted />
                        {i < r.reporters.length - 1 && "、"}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* 關掉的房間重開不了（伺服器拒絕），所以不給「恢復」這顆按鈕。 */}
                {(!r.is_hidden || canUnhide(r.target_kind)) && (
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
                    {r.is_hidden ? "恢復並結案" : hideActionLabel(r.target_kind)}
                  </button>
                )}
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
                {banTarget && (
                  <button
                    className={danger}
                    disabled={busy === key || authorBanned}
                    onClick={() => banAuthor(banTarget)}
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

// 一個申請人的身分，跟 identity.badge_applications.applicant_key 同一個算法。
// 帳號已刪除的申請兩個都是 null，認不出是誰，就不當成重複。
/** 申請人填的連結。像網址的補上 https:// 開新分頁；不像的照原樣顯示，不連。 */
function ApplicantLink({ text }: { text: string }) {
  const href = externalHref(text);
  if (!href) return <span className="break-all">{text}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-[var(--jett-blue)] underline break-all"
    >
      {text}
    </a>
  );
}

function applicantOf(a: BadgeRow): string | null {
  return a.user_id ?? (a.legacy_ck_user ? `ck:${a.legacy_ck_user}` : null);
}

const BADGE_FILTERS = [
  ["pending", "待審"],
  ["approved", "已通過"],
  ["rejected", "已退回"],
  ["all", "全部"],
] as const;

// 排的是畫面上「…申請」的那個時間。預設是最舊的先：等最久的人先看。
const BADGE_SORT_OPTIONS: readonly (readonly [BadgeSort, string])[] = [
  ["newest", "最新申請"],
  ["oldest", "最舊申請"],
];

// export 是給測試用的。
export function BadgesTab() {
  const [status, setStatus] = useState<string>("pending");
  const [sort, setSort] = useState<BadgeSort>("oldest");
  const [busy, setBusy] = useState<string | null>(null);

  // 後面幾頁用游標接，不用 offset：從畫面上最後一列接下去。offset 翻頁時，
  // 翻頁之間有人送出申請（「最新申請」底下整串往後擠一格，重複一位、漏掉
  // 新來的），或是下一頁還在路上時一份審核完成（整串往前縮一格，跳過一位），
  // 接起來都會錯。游標只看「排在誰後面」。
  //
  // 快照（as_of）：第一頁由伺服器定下時間，後面幾頁帶著同一個時間，「全部」
  // 底下有人重新申請也不會讓他換位置再出現一次。快照之後的申請等下一次從頭
  // 載入。號碼牌：只有最後一次發出的第一頁可以定快照（StrictMode 掛載時會
  // 同時有兩個第一頁在路上）。
  const snapshot = useRef<{ ticket: number; asOf?: string }>({ ticket: 0 });
  const shownRows = useRef<BadgeRow[]>([]);
  // 這個資料集裡審核掉了幾列，跟「這一頁發出時是幾」。見 totalOf。
  const reviewed = useRef(0);
  const reviewedAtRequest = useRef(0);
  // 這個資料集裡審核過的人。還在路上的下一頁可能帶著他另一份申請（見
  // visible），審核已經把它一起關掉了，不能再畫出來。從頭載入就清掉。
  const [reviewedPeople, setReviewedPeople] = useState<ReadonlySet<string>>(new Set());
  const fetchPage = useCallback(
    async (o: number) => {
      reviewedAtRequest.current = reviewed.current;
      if (o === 0) setReviewedPeople(new Set());
      if (o > 0) {
        const last = shownRows.current.at(-1);
        const asOf = snapshot.current.asOf;
        return last
          ? admin.badges({
              status,
              offset: 0,
              sort,
              asOf,
              after: { at: last.created_at, id: last.application_id },
            })
          : admin.badges({ status, offset: o, sort, asOf });
      }
      const ticket = snapshot.current.ticket + 1;
      snapshot.current = { ticket };
      const items = await admin.badges({ status, offset: 0, sort });
      if (snapshot.current.ticket === ticket) {
        snapshot.current = { ticket, asOf: items[0]?.as_of };
      }
      return items;
    },
    [status, sort]
  );
  // 總數 = 現在畫面上有幾列 + 這一頁開頭起還有幾個人。不用 total_applicants：
  // 下一頁查詢之前剛審核掉的那一列，伺服器的總數已經少了它，remove 又會再
  // 減一次，「載入更多」就提早消失。「現在畫面上」= 發出時的列數（from）減掉
  // 這一頁在路上時審核掉的：那幾列 remove 已經減過總數，這裡寫進去的值會蓋掉
  // 它，所以要自己扣。
  const totalOf = useCallback((items: BadgeRow[], from: number) => {
    const since = reviewed.current - reviewedAtRequest.current;
    return from - since + (items.length > 0 ? items[0].remaining : 0);
  }, []);
  const keyOf = useCallback((a: BadgeRow) => a.application_id, []);
  const { rows, total, offset, loading, error, load, reload, remove, datasetToken } =
    // 狀態或排序變了都是換資料集，從第一頁重新載入（見 ReportsTab 的說明）。
    usePagedQueue<BadgeRow>({ fetchPage, totalOf, keyOf, resetKey: `${status}|${sort}` });
  // 游標跟著畫面走：審核掉的列已經離開待審，從剩下的最後一列接下去不會漏。
  // useLayoutEffect 在 commit 當下就跑：畫面上看得到這些列的時候 ref 一定已經
  // 是它們。useEffect 是之後才跑，那段空檔裡按下載入更多會拿到舊的列。
  useLayoutEffect(() => {
    shownRows.current = rows ?? [];
  }, [rows]);

  // 同一個人在後面一頁又出現：翻頁之間他多了一份申請（新送出的、或從
  // CloudKit 匯入的舊申請），代表他的那一份換了，位置也跟著換。只畫第一次
  // 出現的那一列；後面那列留在分頁狀態裡（游標與總數都算過它），只是不畫。
  // 反方向（「最新的先」底下還沒看到的人換到游標前面）這一輪看不到他，下次
  // 從頭載入就會出現；他的申請一次審核就全部關掉，不會因此漏審。
  // 這一輪已經審核過的人也一樣不畫：審核在下一頁回來之前完成時，那一頁帶來
  // 的他另一份申請已經被一起關掉了。
  const visible = useMemo(() => {
    if (!rows) return null;
    const seen = new Set<string>(reviewedPeople);
    return rows.filter((a) => {
      const who = applicantOf(a);
      if (!who) return true;
      if (seen.has(who)) return false;
      seen.add(who);
      return true;
    });
  }, [rows, reviewedPeople]);

  // 退回時攤開理由按鈕。清單跟資料庫拿,所以按鈕上寫的和存下來的是同一份資料。
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reasons, setReasons] = useState<BadgeReason[]>([]);
  useEffect(() => {
    let alive = true;
    admin
      .rejectionReasons()
      .then((rs) => alive && setReasons(rs))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function decide(
    a: BadgeRow,
    approve: boolean,
    opts: { note?: string; reasonCode?: string } = {}
  ) {
    const token = datasetToken();
    setBusy(a.application_id);
    try {
      await admin.reviewBadge(a.application_id, approve, opts);
      setRejecting(null);
      // 中途換過資料集：remove 會交給 reconcile 從第一頁重拿，只要叫一次。
      if (token !== datasetToken()) {
        remove(a.application_id, token);
        return;
      }
      // 一次審核關掉這個人所有待審的申請，所以藏起來的重複列也一起拿掉。
      const who = applicantOf(a);
      const gone = shownRows.current
        .filter((r) => r.application_id !== a.application_id && who !== null && applicantOf(r) === who)
        .map((r) => r.application_id);
      gone.unshift(a.application_id);
      reviewed.current += gone.length;
      if (who !== null) setReviewedPeople((prev) => new Set(prev).add(who));
      for (const id of gone) remove(id, token);
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "操作失敗");
    } finally {
      setBusy(null);
    }
  }

  function reject(a: BadgeRow, r: BadgeReason) {
    if (r.needs_own_words) {
      // 「其他」的意思就是清單上沒有,所以一定要自己寫。
      const written = prompt("退回理由（申請人看得到）");
      if (!written?.trim()) return;
      void decide(a, false, { reasonCode: r.code, note: written.trim() });
      return;
    }
    // 固定理由不送文字:那句話伺服器自己有,由它決定才算「一致」。
    void decide(a, false, { reasonCode: r.code });
  }

  const chip = (active: boolean) =>
    `${button} text-xs ${active ? "bg-[var(--bg-panel-hover)]" : ""}`;

  const filters = (
    <div className="space-y-2 mb-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <div role="group" aria-label="狀態" className="flex flex-wrap gap-2">
          {BADGE_FILTERS.map(([key, label]) => (
            <button
              key={key}
              className={chip(status === key)}
              aria-pressed={status === key}
              onClick={() => setStatus(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {rows && visible && (
          <span className="text-xs opacity-60 ml-1">
            {/* 藏起來的重複列算在分頁裡，不算人數。 */}
            {total - (rows.length - visible.length)} 位申請人，已載入 {visible.length}
          </span>
        )}
      </div>
      <div role="group" aria-label="排序" className="flex flex-wrap items-baseline gap-2">
        <span aria-hidden="true" className="text-xs opacity-60">
          排序：
        </span>
        {BADGE_SORT_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            className={chip(sort === key)}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  if (error && !rows?.length) {
    return (
      <>
        {filters}
        <LoadError message={error} busy={loading} onRetry={reload} />
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
        {(visible ?? []).map((a) => (
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
                    <ApplicantLink text={l} />
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
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy === a.application_id}
                    onClick={() => void decide(a, true)}
                  >
                    通過{a.application_count > 1 ? `（${a.application_count} 份一起）` : ""}
                  </button>
                  <button
                    className={danger}
                    disabled={busy === a.application_id}
                    onClick={() =>
                      setRejecting(rejecting === a.application_id ? null : a.application_id)
                    }
                  >
                    {rejecting === a.application_id ? "取消退回" : "退回…"}
                  </button>
                </div>
                {rejecting === a.application_id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-xs opacity-60 mb-2">
                      選一個理由。<strong>申請人會看到這句話</strong>，所以是固定寫法而不是每次自己打。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {reasons.map((r) => (
                        <button
                          key={r.code}
                          className={`${button} text-xs`}
                          disabled={busy === a.application_id}
                          title={r.note ?? "按下之後自己填"}
                          onClick={() => reject(a, r)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

// 處置紀錄。四種來源，因為它們本來就是四件不同的事,而且各自已經有完整的
// 紀錄:內容的處置在 moderation_actions,藍勾勾的判斷在申請那一列上,封禁在
// identity.bans 上,送 Premium 在 identity.premium_grants 上。硬把後兩種塞進 moderation_actions 會讓同一件事有兩份可以
// 互相矛盾的紀錄。
const HISTORY_SOURCES = [
  ["content", "內容處置"],
  ["badges", "藍勾勾審核"],
  ["bans", "封禁"],
  ["premium", "Premium"],
] as const;

const ACTION_LABELS: Record<string, string> = {
  hide: "下架",
  unhide: "恢復顯示",
  delete: "刪除",
  "report:actioned": "檢舉結案（已處置）",
  "report:dismissed": "檢舉結案（沒問題）",
  "report:open": "重開檢舉",
};

function HistoryTab() {
  const [source, setSource] = useState<string>("content");

  const nav = (
    <div className="flex flex-wrap items-baseline gap-2 mb-3">
      {HISTORY_SOURCES.map(([key, label]) => (
        <button
          key={key}
          className={`${button} text-xs ${source === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
          onClick={() => setSource(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {nav}
      {source === "content" && <ContentHistory />}
      {source === "badges" && <BadgeHistory />}
      {source === "bans" && <BanHistory />}
      {source === "premium" && <PremiumHistory />}
    </>
  );
}

// 處置的結果分四種判斷。混在一起看不出「我上週刪了什麼」。
const ACTION_FILTERS = [
  ["", "全部"],
  ["hide", "下架"],
  ["unhide", "恢復"],
  ["delete", "刪除"],
  ["report:actioned", "結案：已處置"],
  ["report:dismissed", "結案：沒問題"],
] as const;

// 處置紀錄上的「對象」：作者的名牌（處置當下記的；之後認領了就是帳號）、
// 現在是否封禁中，以及封禁按鈕。資料庫還是舊版（沒有 subject）的時候退回
// 原本那一行字。
function SubjectLine({
  row: a,
  banned,
  pending,
  onBan,
}: {
  row: Fetched<ActionRow>;
  banned: LocalBans;
  /** 正在送出的封禁（banKeyOf）。同一個人的每一列都鎖住，不送第二次。 */
  pending: ReadonlySet<string>;
  onBan: (t: BanTarget) => void;
}) {
  const subject = a.subject ?? null;
  const target = subject ? banTargetOf(subject.user_id, a.subject_status) : null;
  const isBanned =
    (a.subject_status?.banned ?? false) ||
    (target !== null && bannedHere(banned, banKeyOf(target), a.fetched_at));
  return (
    <div className="text-xs opacity-60 mb-1 space-y-1">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span>對象：</span>
        {subject ? (
          <PersonBadge person={subject} />
        ) : (
          <span>
            {a.subject_name ?? (a.subject_legacy_ck_user ? "尚未認領的舊帳號" : "（未記錄）")}
          </span>
        )}
        {subject && !subject.claimed && <span className="opacity-60">· 尚未認領</span>}
        {isBanned ? (
          <span className="text-[var(--val-red)]">· 封禁中</span>
        ) : (
          target && (
            <button
              className={`${danger} text-xs px-2 py-0.5`}
              disabled={pending.has(banKeyOf(target))}
              onClick={() => onBan(target)}
            >
              永久封禁作者
            </button>
          )
        )}
      </p>
      {subject && !subject.claimed && (
        <LinkedAccounts
          accounts={a.subject_status?.accounts ?? []}
          bannedHere={(userId) => bannedHere(banned, banKeyOf({ userId }), a.fetched_at)}
          busy={(userId) => pending.has(banKeyOf({ userId }))}
          onBan={(userId) => onBan({ userId })}
        />
      )}
    </div>
  );
}

// export 是給測試用的。
export function ContentHistory() {
  const [action, setAction] = useState<string>("");
  // 送出中的封禁（banKeyOf）與這個分頁剛封掉的人（見 bannedHere）。各自一把鎖：
  // 同時封兩個人，先回來的那一個不能把另一個的鎖拿掉。
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [banned, setBanned] = useState<LocalBans>(new Map());
  async function ban(t: BanTarget) {
    const why = askBanReason(t);
    if (!why) return;
    const k = banKeyOf(t);
    setPending((prev) => new Set(prev).add(k));
    try {
      await sendBan(t, why);
      const at = tick();
      setBanned((prev) => new Map(prev).set(k, at));
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "封禁失敗");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }
  }
  const fetchPage = useCallback(
    async (o: number) => {
      const at = tick();
      return stamp(await admin.actions(o, action || undefined), at);
    },
    [action]
  );
  const totalOf = useCallback(
    (items: ActionRow[], from: number) => (items.length > 0 ? items[0].total_actions : from),
    []
  );
  const keyOf = useCallback((a: ActionRow) => a.action_id, []);
  const { rows, total, offset, loading, error, load, reload } =
    usePagedQueue<Fetched<ActionRow>>({ fetchPage, totalOf, keyOf, resetKey: action });

  const filters = (
    <div className="flex flex-wrap items-baseline gap-2 mb-3">
      {ACTION_FILTERS.map(([key, label]) => (
        <button
          key={key || "all"}
          className={`${button} text-xs ${action === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
          onClick={() => setAction(key)}
        >
          {label}
        </button>
      ))}
      {rows && (
        <span className="text-xs opacity-60 ml-1">
          {total} 筆，已載入 {rows.length}
        </span>
      )}
    </div>
  );

  if (error && !rows?.length) {
    return (
      <>
        {filters}
        <LoadError message={error} busy={loading} onRetry={reload} />
      </>
    );
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0) {
    return (
      <>
        {filters}
        <p className="text-sm opacity-60">
          {action ? "這種處置還沒有紀錄。" : "還沒有任何內容處置。"}
        </p>
      </>
    );
  }

  return (
    <>
      {filters}
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
                <span>{targetKindLabel(a.target_kind)}</span>
                <span>·</span>
                <span>{timeAgo(a.created_at)}</span>
                {a.admin_name && <span>· 由 {a.admin_name}</span>}
                {!a.content_exists && <span className="text-[var(--val-red)]">· 內容已刪除</span>}
                {a.content_exists && a.content_hidden && (
                  <span>· 目前{hiddenLabel(a.target_kind)}</span>
                )}
              </div>
              <SubjectLine
                row={a}
                banned={banned}
                pending={pending}
                onBan={(t) => void ban(t)}
              />
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

function BadgeHistory() {
  // 同一份清單,只是這裡拿來把 code 翻成看得懂的標籤。
  const [reasonLabels, setReasonLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    admin
      .rejectionReasons()
      .then((rs) => {
        if (alive) {
          setReasonLabels(Object.fromEntries(rs.map((r) => [r.code, r.label])));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const fetchPage = useCallback((o: number) => admin.badgeReviews(o), []);
  const totalOf = useCallback(
    (items: BadgeReviewRow[], from: number) =>
      items.length > 0 ? items[0].total_reviews : from,
    []
  );
  const keyOf = useCallback((a: BadgeReviewRow) => a.application_id, []);
  const { rows, total, offset, loading, error, load, reload } =
    usePagedQueue<BadgeReviewRow>({ fetchPage, totalOf, keyOf });

  if (error && !rows?.length) {
    return <LoadError message={error} busy={loading} onRetry={reload} />;
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0) return <p className="text-sm opacity-60">還沒有審過任何申請。</p>;

  return (
    <>
      <p className="text-xs opacity-60 mb-3">
        {total} 次判斷，已載入 {rows.length}
      </p>
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.application_id} className={panel}>
            <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
              <strong
                className={`text-sm opacity-100 ${
                  a.status === "approved" ? "text-[var(--gold)]" : "text-[var(--val-red)]"
                }`}
              >
                {a.status === "approved" ? "通過" : "退回"}
              </strong>
              <span>·</span>
              <strong className="text-sm opacity-100">{a.nickname}</strong>
              <span>·</span>
              <span>{timeAgo(a.reviewed_at)}</span>
              {a.reviewer_name && <span>· 由 {a.reviewer_name}</span>}
              {a.applications_closed > 1 && (
                <span>· 一次結掉 {a.applications_closed} 份</span>
              )}
            </div>
            <p className="text-xs opacity-60 mb-2">
              申請人：
              {a.display_name ?? (a.legacy_ck_user ? "尚未認領的舊帳號" : "（未知）")}
              {a.status === "approved" && a.legacy_ck_user && (
                // 核准舊申請只記錄決定,勾勾要等這個人認領帳號之後才會掛上。
                <span className="text-[var(--gold)]">　·　勾勾待認領後生效</span>
              )}
            </p>
            {a.intro && <p className="text-sm mb-2 whitespace-pre-wrap opacity-80">{a.intro}</p>}
            {a.links.length > 0 && (
              <ul className="text-xs mb-1 space-y-0.5">
                {a.links.map((l) => (
                  <li key={l}>
                    <ApplicantLink text={l} />
                  </li>
                ))}
              </ul>
            )}
            {a.reason_code && (
              <p className="text-xs opacity-60 mt-1">
                理由：
                {reasonLabels[a.reason_code] ?? a.reason_code}
              </p>
            )}
            {a.review_note && (
              <p className="text-xs opacity-60 mt-1">
                {/* 申請人看到的就是這一句。 */}
                申請人看到：{a.review_note}
              </p>
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
    </>
  );
}

// export 是給測試用的。
export function BanHistory() {
  const fetchPage = useCallback((o: number) => admin.banLog(o), []);
  const totalOf = useCallback(
    (items: BanRow[], from: number) => (items.length > 0 ? items[0].total_bans : from),
    []
  );
  const keyOf = useCallback((b: BanRow) => b.ban_id, []);
  const { rows, total, offset, loading, error, load, reload } =
    usePagedQueue<BanRow>({ fetchPage, totalOf, keyOf });
  const [lifting, setLifting] = useState<string | null>(null);

  // 解除照封禁掛在哪裡來：帳號（解除這個帳號所有生效中的封禁），或還沒認領
  // 的舊鑰匙。造型舊留言的作者只有鑰匙、沒有查人頁，這裡是唯一解得掉的地方。
  async function lift(b: BanRow) {
    setLifting(b.ban_id);
    try {
      if (b.user_id) await admin.liftBan(b.user_id);
      else if (b.legacy_key && b.legacy_key_kind) {
        await admin.liftLegacyBan(b.legacy_key_kind, b.legacy_key);
      }
      reload();
    } catch (err) {
      alert(err instanceof AdminRequestError ? err.message : "解禁失敗");
    } finally {
      setLifting(null);
    }
  }

  if (error && !rows?.length) {
    return <LoadError message={error} busy={loading} onRetry={reload} />;
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0) return <p className="text-sm opacity-60">還沒有封禁過任何人。</p>;

  return (
    <>
      <p className="text-xs opacity-60 mb-3">
        {total} 筆封禁，已載入 {rows.length}
      </p>
      <ul className="space-y-3">
        {rows.map((b) => (
          <li key={b.ban_id} className={panel}>
            <div className="flex flex-wrap items-baseline gap-2 text-xs opacity-70 mb-2">
              {/* 帳號都不在了的封禁擋不住任何人（is_banned 照 user_id 查），
                  所以那不是「封禁中」,也不是「已解除」——沒有人解除過它。 */}
              <strong
                className={`text-sm opacity-100 ${
                  b.is_active ? "text-[var(--val-red)]" : ""
                }`}
              >
                {b.subject_deleted
                  ? "帳號已刪除"
                  : b.is_active
                    ? "封禁中"
                    : b.lifted_at
                      ? "已解除"
                      : "已到期"}
              </strong>
              <span>·</span>
              <span>{b.display_name ?? b.user_id ?? b.legacy_key ?? "（未知）"}</span>
              {b.legacy_key && !b.user_id && (
                <span>
                  {b.legacy_key_kind === "author_key"
                    ? "· 造型舊留言的作者鑰匙"
                    : "· 舊版身分（尚未認領）"}
                </span>
              )}
              <span>·</span>
              <span>{timeAgo(b.created_at)}封禁</span>
              {b.created_by_name && <span>· 由 {b.created_by_name}</span>}
              <span>
                ·{" "}
                {b.expires_at
                  ? `到期 ${new Date(b.expires_at).toLocaleDateString()}`
                  : "永久"}
              </span>
            </div>
            {b.reason && <p className="text-sm opacity-80 mb-1">理由：{b.reason}</p>}
            {b.lifted_at && (
              <p className="text-xs opacity-60">
                {timeAgo(b.lifted_at)}解除
                {b.lifted_by_name ? `，由 ${b.lifted_by_name}` : ""}
              </p>
            )}
            {b.is_active && (b.user_id || (b.legacy_key && b.legacy_key_kind)) && (
              <button
                className={`${button} text-xs mt-2`}
                disabled={lifting === b.ban_id}
                onClick={() => void lift(b)}
              >
                解除封禁
              </button>
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
    </>
  );
}

function PremiumHistory() {
  const fetchPage = useCallback((o: number) => admin.premiumLog(o), []);
  const totalOf = useCallback(
    (items: PremiumLogRow[], from: number) => (items.length > 0 ? items[0].total_grants : from),
    []
  );
  const keyOf = useCallback((g: PremiumLogRow) => g.grant_id, []);
  const { rows, total, offset, loading, error, load, reload } =
    usePagedQueue<PremiumLogRow>({ fetchPage, totalOf, keyOf });

  if (error && !rows?.length) {
    return <LoadError message={error} busy={loading} onRetry={reload} />;
  }
  if (!rows) return <p className="text-sm opacity-60">載入中…</p>;
  if (rows.length === 0) return <p className="text-sm opacity-60">還沒有送過 Premium。</p>;

  return (
    <>
      <p className="text-xs opacity-60 mb-3">
        {total} 筆，已載入 {rows.length}
      </p>
      <ul className="space-y-3">
        {rows.map((g) => (
          <li key={g.grant_id} className={panel}>
            <p className="text-sm mb-1">
              <strong>
                {g.subject_deleted ? "帳號已刪除：" : ""}
                {g.display_name ?? g.user_id ?? "（未知）"}
              </strong>
            </p>
            <div className="text-xs">
              <PremiumGrantLine grant={g} />
            </div>
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
    </>
  );
}

// 一個人的名牌。認領過的和沒認領的長得一樣,差別在旁邊那個標記——遷移期間
// 幾乎所有人都是後者,所以「沒認領」不是異常狀態,是常態。
function PersonBadge({ person, muted = false }: { person: Person; muted?: boolean }) {
  // 查不到名字的時候顯示 puuid 而不是一句籠統的話:兩個查不到的檢舉人如果長得
  // 一模一樣,就看不出是兩個人,也沒辦法把他們跟別的案子對起來。
  const nameless = person.puuid ? `（無名，${person.puuid.slice(0, 8)}…）` : "（未知）";
  const name = person.name ?? nameless;
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 ${muted ? "opacity-70" : ""}`}
      title={person.puuid ?? person.ck_user ?? undefined}
    >
      {person.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={person.image}
          alt=""
          className="h-4 w-4 rounded-sm self-center object-cover"
        />
      )}
      <span>{name}</span>
      {person.tag_line && <span className="opacity-60">#{person.tag_line}</span>}
      {typeof person.rank_tier === "number" && person.rank_tier > 0 && (
        <span className="opacity-60">· 段位 {person.rank_tier}</span>
      )}
      {/* CloudKit 時代客戶端寫得動這兩個旗標,所以它們是「他當時聲稱的」,
          不是事實。顯示成「自稱」是刻意的:當成事實顯示,就是讓一個偽造的
          藍勾勾活過遷移。 */}
      {person.ck_claimed_verify && (
        <span className="opacity-60" title="CloudKit 時代客戶端可寫，不是事實">
          · 舊系統自稱已認證
        </span>
      )}
      {person.ck_claimed_premium && (
        <span className="opacity-60" title="CloudKit 時代客戶端可寫，不是事實">
          · 舊系統自稱 Premium
        </span>
      )}
      {person.is_verified && <span className="text-[var(--jett-blue)]">· 已認證</span>}
    </span>
  );
}

// 查使用者。輸入遊戲名稱（名字#TAG 或名字）、帳號 id 或 puuid 就搜尋
// identity.profiles；_ 開頭的是還沒認領的 CloudKit 身分，那種沒有帳號，搜尋
// 找不到，直接開它的檔案。
export function UserTab() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PersonHit[] | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  // 號碼牌：每換一次選擇（查詢、打開一個人）就換一張。只有最後一次發出的
  // 可以寫畫面：連打兩次時，慢回來的那一個不能把後面那個人的檔案蓋掉。
  const ticket = useRef(0);
  // 畫面上現在是誰。重讀只對還在畫面上的那個人有效。
  const shown = useRef<UserDetail | null>(null);
  // 同一個人的重讀可能好幾個同時在路上（再點一次、送完、封禁完）。只有最後
  // 發出的那一個可以寫畫面：慢回來的舊結果不能蓋掉新的。
  const refreshSeq = useRef(0);
  const show = useCallback((d: UserDetail | null) => {
    shown.current = d;
    setDetail(d);
  }, []);

  // 封禁、送 Premium 之後重讀同一個人。不先清掉畫面：卡片底下的 Premium
  // 區塊會被拆掉重建，剛顯示的結果就看不到了。不換號碼牌：送 A 的請求在
  // 路上時換去看 B，A 回來的重讀不能把 B 換掉。還沒認領的身分照 CloudKit
  // 身分認人。
  const reread = useCallback(async (key: { userId?: string; legacyCkUser?: string }) => {
    const isShown = () =>
      key.userId
        ? shown.current?.user_id === key.userId
        : !shown.current?.claimed && shown.current?.legacy_ck_user === key.legacyCkUser;
    // 不是畫面上那個人的重讀（例如換人之後才回來的舊動作）直接放棄，而且不能
    // 拿號碼：拿了會讓畫面上那個人正在路上的重讀作廢。
    if (!isShown()) return;
    const mine = ticket.current;
    const seq = ++refreshSeq.current;
    try {
      const found = await admin.person(key);
      if (mine === ticket.current && seq === refreshSeq.current && isShown()) {
        show(found);
      }
    } catch {
      // 重讀失敗就留著原本的畫面，動作本身已經有自己的結果訊息。
    }
  }, [show]);
  const refresh = useCallback((userId: string) => reread({ userId }), [reread]);

  const open = useCallback(
    async (key: { userId?: string; legacyCkUser?: string }) => {
      // 再點一次畫面上的那個人：重讀就好。拆掉重建會讓進行中的送出失去
      // 「送出中」的鎖。
      if (key.userId && shown.current?.user_id === key.userId) return refresh(key.userId);
      if (
        key.legacyCkUser &&
        shown.current &&
        !shown.current.claimed &&
        shown.current.legacy_ck_user === key.legacyCkUser
      ) {
        return reread(key);
      }
      const mine = ++ticket.current;
      setError(null);
      show(null);
      try {
        const found = await admin.person(key);
        if (mine === ticket.current) show(found);
      } catch (err) {
        if (mine === ticket.current) {
          setError(err instanceof AdminRequestError ? err.message : "查詢失敗");
        }
      }
    },
    [refresh, reread, show]
  );

  const look = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    if (q.startsWith("_")) {
      setHits(null);
      setSearching(false);
      return open({ legacyCkUser: q });
    }
    const mine = ++ticket.current;
    setError(null);
    show(null);
    setHits(null);
    setSearching(true);
    try {
      const items = await admin.search(q);
      if (mine !== ticket.current) return;
      setHits(items);
      setSearching(false);
      // 只有一個人就直接打開，省一次點擊。
      if (items.length === 1) void open({ userId: items[0].user_id });
    } catch (err) {
      if (mine === ticket.current) {
        setSearching(false);
        setError(err instanceof AdminRequestError ? err.message : "查詢失敗");
      }
    }
  }, [query, open, show]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className={input}
          placeholder="遊戲名稱（名字#TAG 或名字）、帳號 uuid、puuid，或 CloudKit 身分（_ 開頭）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void look();
          }}
        />
        <button className={button} onClick={() => void look()}>
          查詢
        </button>
      </div>
      {searching && <p className="text-sm opacity-60">查詢中…</p>}
      {error && <p className="text-sm text-[var(--val-red)]">{error}</p>}
      {hits && hits.length === 0 && (
        <p className="text-sm opacity-60">
          找不到。這裡只找得到在新版 App 登入過社群帳號的人；還沒登入的人在 RevenueCat
          也只有匿名 id，沒辦法從名字找到。
        </p>
      )}
      {hits && hits.length > 0 && (
        <div>
          <ul className="space-y-1">
            {hits.map((h) => (
              <li key={h.user_id}>
                <button
                  className={`${button} w-full text-left flex flex-wrap items-baseline gap-x-1.5 ${
                    detail?.user_id === h.user_id ? "bg-[var(--bg-panel-hover)]" : ""
                  }`}
                  onClick={() => void open({ userId: h.user_id })}
                >
                  <strong>{h.game_name ?? h.display_name ?? "（沒有名字）"}</strong>
                  {h.game_name && h.tag_line && <span className="opacity-60">#{h.tag_line}</span>}
                  <span className="text-xs opacity-50">· {MATCH_LABELS[h.matched] ?? h.matched}</span>
                  {h.is_verified && <span className="text-xs text-[var(--jett-blue)]">· 已認證</span>}
                  {h.premium_active && (
                    <span className="text-xs text-[var(--gold)]">
                      · Premium 到期：{expiryLabel(h.premium_expires_at)}
                    </span>
                  )}
                  {h.banned && <span className="text-xs text-[var(--val-red)]">· 封禁中</span>}
                  <span className="text-xs opacity-50 ml-auto">
                    加入 {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hits.length >= 20 && (
            <p className="text-xs opacity-60 mt-2">
              只列出前 20 筆。打完整的「名字#TAG」可以縮小範圍。
            </p>
          )}
        </div>
      )}
      {detail && (
        <div className={panel}>
          <p className="text-sm mb-2">
            <strong>{detail.display_name ?? "（尚未認領的舊帳號）"}</strong>
            {detail.is_verified && <span className="text-[var(--jett-blue)]"> · 已認證</span>}
            {detail.is_premium && <span className="text-[var(--gold)]"> · Premium</span>}
            {!detail.claimed && <span className="opacity-60"> · 尚未認領</span>}
          </p>
          <p className="text-xs opacity-70 mb-2 font-mono break-all">
            {detail.claimed ? detail.user_id : detail.legacy_ck_user}
          </p>
          <p className="text-xs opacity-70 mb-3">
            貼文 {detail.posts} · 留言 {detail.comments} · 已下架{" "}
            {detail.hidden_content} · 被檢舉 {detail.reports_against} · 被處置{" "}
            {detail.actions_against}
          </p>
          {detail.identities.length > 0 && (
            <div className="text-xs opacity-70 mb-3">
              <p className="mb-1">
                用過的 Riot 帳號（App 支援一個人登入多個，所以不只一個是正常的）：
              </p>
              <ul className="space-y-0.5">
                {detail.identities.map((p) => (
                  <li key={p.puuid ?? p.name}>
                    <PersonBadge person={p} muted />
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                  void (
                    detail.claimed
                      ? admin.liftBan(detail.user_id!).then(() => refresh(detail.user_id!))
                      : admin
                          .liftLegacyBan("ck_user", detail.legacy_ck_user!)
                          .then(() => reread({ legacyCkUser: detail.legacy_ck_user! }))
                  ).catch(() => setError("解禁失敗"))
                }
              >
                解除封禁
              </button>
            </div>
          ) : detail.claimed ? (
            <button
              className={danger}
              onClick={() => {
                const why = prompt("封禁理由");
                if (!why?.trim()) return;
                void admin
                  .ban(detail.user_id!, why, null)
                  .then(() => refresh(detail.user_id!))
                  .catch(() => setError("封禁失敗"));
              }}
            >
              永久封禁
            </button>
          ) : (
            // 舊身分還沒有帳號，封禁掛在 CloudKit 身分上。講清楚它擋的是什麼，
            // 免得以為他已經在的內容會一起消失。
            <div>
              <p className="text-xs opacity-60 mb-2">
                這個身分還沒認領。封禁之後，他從舊版 App 同步進來的新內容會直接下架，升級認領時新帳號一起封禁；已經在的內容不會動。
              </p>
              <button
                className={danger}
                onClick={() => {
                  const ck = detail.legacy_ck_user!;
                  const why = prompt("封禁理由");
                  if (!why?.trim()) return;
                  void admin
                    .banLegacy("ck_user", ck, why)
                    .then(() => reread({ legacyCkUser: ck }))
                    .catch(() => setError("封禁失敗"));
                }}
              >
                永久封禁
              </button>
            </div>
          )}
          {detail.claimed && detail.user_id && (
            <PremiumSection
              key={detail.user_id}
              userId={detail.user_id}
              name={detail.display_name}
              onChanged={() => void refresh(detail.user_id!)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// 卡片上的會員區。授權在 RevenueCat：這裡送出去的是 promotional entitlement，
// 金勾由伺服器從 RevenueCat 重查後寫入，不是這個畫面說了算。
export function PremiumSection({
  userId,
  name,
  onChanged,
}: {
  userId: string;
  name: string | null;
  onChanged: () => void;
}) {
  const [info, setInfo] = useState<PremiumDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duration, setDuration] = useState<PremiumDuration>("one_month");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState(0);
  // 送出去的請求可能在卡片換人（拆掉）之後才回來。那時候什麼都不該再碰：
  // 不寫狀態，也不叫外面重讀（會把畫面上的另一個人換掉）。
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    admin
      .premium(userId)
      .then((d) => {
        if (alive) {
          setInfo(d);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (alive) setLoadError(err instanceof AdminRequestError ? err.message : "讀取失敗");
      });
    return () => {
      alive = false;
    };
  }, [userId, version]);

  const who = name ?? userId;
  const run = async (action: "grant" | "revoke" | "refresh") => {
    const reason = why.trim();
    if (action !== "refresh") {
      if (!reason) {
        setResult({ ok: false, text: "要寫理由（之後在處置紀錄裡看得到）。" });
        return;
      }
      const question =
        action === "grant"
          ? `送 ${durationLabel(duration)} Premium 給 ${who}？`
          : `收回 ${who} 所有贈送的 Premium？App Store 付費訂閱不受影響。`;
      if (!confirm(question)) return;
    }
    setBusy(true);
    setResult(null);
    let outcome: { ok: boolean; text: string };
    try {
      const r =
        action === "grant"
          ? await admin.grantPremium(userId, duration, reason)
          : action === "revoke"
            ? await admin.revokePremium(userId, reason)
            : await admin.refreshPremium(userId);
      outcome = { ok: true, text: changeMessage(action, r) };
      if (action !== "refresh" && alive.current) setWhy("");
    } catch (err) {
      const unsettled =
        err instanceof AdminRequestError && err.status === 504 && action !== "refresh" &&
        typeof err.body === "object" && err.body !== null;
      outcome = {
        ok: false,
        text: unsettled
          ? unsettledMessage(action, err.body as Record<string, unknown>)
          : err instanceof AdminRequestError
            ? err.message
            : "送出失敗",
      };
    }
    if (!alive.current) return;
    setResult(outcome);
    setBusy(false);
    // 失敗也重讀：結果不明的那一種，紀錄上已經多了一列，重查也可能已經寫進去。
    setVersion((v) => v + 1);
    onChanged();
  };

  const m = info?.membership;
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-dim)]">
      <p className="text-sm mb-1">
        <strong>Premium</strong>
        {info &&
          (info.active ? (
            <span className="text-[var(--gold)]">
              {" "}
              · 有效，到期：{expiryLabel(m?.expires_at ?? null)}
            </span>
          ) : (
            <span className="opacity-60"> · 沒有</span>
          ))}
      </p>
      {loadError && <p className="text-xs text-[var(--val-red)] mb-2">{loadError}</p>}
      {m && (
        <p className="text-xs opacity-60 mb-2">
          最後一次從 RevenueCat 確認：{timeAgo(m.checked_at)}
        </p>
      )}
      <p className="text-xs opacity-60 mb-3">
        RevenueCat 用這個帳號 id 認人。對方要在新版 App 登入社群帳號才會生效；還沒登入的，
        登入之後就有。期限從現在算，不會疊加。
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PREMIUM_DURATIONS.map(([key, label]) => (
          <button
            key={key}
            className={`${button} text-xs ${duration === key ? "bg-[var(--bg-panel-hover)]" : ""}`}
            aria-pressed={duration === key}
            onClick={() => setDuration(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          className={input}
          placeholder="理由（必填，例如：活動獎勵、客服補償）"
          value={why}
          maxLength={500}
          onChange={(e) => setWhy(e.target.value)}
        />
        <button className={button} disabled={busy} onClick={() => void run("grant")}>
          {busy ? "處理中…" : `送 ${durationLabel(duration)}`}
        </button>
        <button className={danger} disabled={busy} onClick={() => void run("revoke")}>
          收回
        </button>
      </div>
      <button className={`${button} text-xs mb-2`} disabled={busy} onClick={() => void run("refresh")}>
        向 RevenueCat 重新確認
      </button>
      {result && (
        <p className={`text-sm mb-2 ${result.ok ? "" : "text-[var(--val-red)]"}`}>{result.text}</p>
      )}
      {info && info.grants.length > 0 && (
        <ul className="space-y-1 text-xs opacity-80">
          {info.grants.map((g) => (
            <li key={g.grant_id}>
              <PremiumGrantLine grant={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PremiumGrantLine({ grant: g }: { grant: PremiumGrant }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={g.status === "applied" ? "" : "text-[var(--val-red)]"}>
        {(g.error && GRANT_ERROR_LABELS[g.error]) ?? GRANT_STATUS_LABELS[g.status] ?? g.status}
      </span>
      <span>·</span>
      <span>
        {g.action === "grant"
          ? `送 ${durationLabel(g.duration)}${g.ends_at ? `（到 ${new Date(g.ends_at).toLocaleDateString()}）` : ""}`
          : "收回"}
      </span>
      {g.observed_active !== null && (
        <span className="opacity-80">
          → RevenueCat：
          {g.observed_active ? `有效，到期 ${expiryLabel(g.observed_expires_at)}` : "沒有 Premium"}
        </span>
      )}
      <span className="opacity-60">· {timeAgo(g.created_at)}</span>
      {g.created_by_name && <span className="opacity-60">· 由 {g.created_by_name}</span>}
      <span className="opacity-80">· {g.reason}</span>
      {g.error && !GRANT_ERROR_LABELS[g.error] && (
        <span className="opacity-50 font-mono">({g.error})</span>
      )}
    </span>
  );
}
