// 造型投票的瀏覽器端寫入層（CloudKit JS，以登入者身分）。
// 這裡是資料損壞風險所在，規則全部承襲 iOS SkinRatingService：
// - 一人一票是「慣例」：查我的 Rating，更新最新一筆，絕不多插一筆
// - 彙總是 fetch-最新值 + delta 的 CAS 寫入（saveRecords 自動帶
//   recordChangeTag），衝突就重抓重試（≤3）
// - 投票寫入結果「不明」（網路斷在半路）時：不套 delta，寧可短暫
//   少計（iOS 的 recount 會補正）也絕不冒重複計數的險
// - 寫入目標＝最舊的彙總 record（與 iOS 的選擇一致，否則票數分家）

import {
  getPublicDatabase,
  queryAllCKJS,
  type CKJSRecord,
} from "@/lib/ratings/cloudkit-js";
import { computeDelta, mergeAggregates, oldestFirst } from "@/lib/ratings/aggregate";
import type { SkinAggregate } from "@/lib/cloudkit/types";

/** 每 (使用者, 造型) 30 秒的投票節流（iOS 同值；localStorage 跨分頁生效） */
const RATING_THROTTLE_MS = 30_000;
const AGGREGATE_RETRY_LIMIT = 3;

// ---------- 修復日誌（iOS PendingDeltaJournal 的網頁版對應） ----------
// 投票與彙總是兩個不可交易的寫入：分頁在兩者之間關掉，票會計了但
// 計數器沒跟上，而 iOS 的日誌只認得 iOS 自己的意圖。所以網頁端在
// 「投票寫入之前」就把意圖落地 localStorage，兩段都成功才移除；
// 下次登入時重放（見 replaySkinRatingRepairs）。

/** 日誌以「每個造型一把 key」分片：不同造型的寫入不共用同一筆
 * localStorage 值，read-modify-write 就不會互吃條目；同一造型的寫入
 * 全部發生在該造型的跨分頁鎖之內（見 withSkinLock）。 */
const REPAIR_JOURNAL_PREFIX = "skinRatingRepairJournal:";

function journalStorageKey(skinID: string): string {
  return `${REPAIR_JOURNAL_PREFIX}${skinID}`;
}

/**
 * 重放只碰早於此的條目：避開同分頁還在跑的 submit，也讓 CloudKit
 * 最終一致的查詢索引先把剛落地的票收進來（重數太早會少算）
 */
const REPAIR_MIN_AGE_MS = 5 * 60_000;

interface RepairEntry {
  id: string;
  userRecordName: string;
  skinID: string;
  /** 這次嘗試投的值（pre-vote 的落地判定用） */
  value: number;
  countDelta: number;
  sumDelta: number;
  /** pre-vote＝投票寫入結果不明；vote-committed＝票已計、只欠彙總 */
  stage: "pre-vote" | "vote-committed";
  createdAt: number;
}

function readJournalFor(skinID: string): RepairEntry[] {
  try {
    const raw = localStorage.getItem(journalStorageKey(skinID));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RepairEntry[]) : [];
  } catch {
    return [];
  }
}

function writeJournalFor(skinID: string, entries: RepairEntry[]) {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(journalStorageKey(skinID));
    } else {
      localStorage.setItem(journalStorageKey(skinID), JSON.stringify(entries));
    }
  } catch {
    // localStorage 不可用：退化成沒有日誌（修不了帳，但也絕不憑
    // 「日誌不見了」做任何補償——缺席不是證據）
  }
}

function journalUpsertFor(skinID: string, entry: RepairEntry) {
  writeJournalFor(skinID, [
    ...readJournalFor(skinID).filter((existing) => existing.id !== entry.id),
    entry,
  ]);
}

function journalRemoveFor(skinID: string, entryID: string) {
  writeJournalFor(
    skinID,
    readJournalFor(skinID).filter((existing) => existing.id !== entryID)
  );
}

/** 掃出所有留有日誌的造型（重放的工作清單） */
function journaledSkinIDs(): string[] {
  const skinIDs: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(REPAIR_JOURNAL_PREFIX)) {
        skinIDs.push(key.slice(REPAIR_JOURNAL_PREFIX.length));
      }
    }
  } catch {
    // localStorage 不可用：沒有可重放的帳
  }
  return skinIDs;
}

// ---------- 跨分頁互斥（Web Locks） ----------
// delta 與重數絕不能在同一筆帳上交錯——時間圍欄只能縮小窗口，關不
// 死它（await 可以停在任何地方停任意久）。Web Locks 是正確的原語：
// 同源跨分頁的互斥鎖，分頁死掉自動釋放，作用域剛好就是共享這份
// localStorage 日誌的那群分頁。
// submit 走「等待＋逾時」；重放走 ifAvailable（拿不到就跳過，下次
// 再修——被凍結的分頁抱著鎖時，寧可延後修帳也不能修錯帳）。

const SUBMIT_LOCK_TIMEOUT_MS = 15_000;

function skinLockName(skinID: string): string {
  return `skin-rating:${skinID}`;
}

async function withSkinLock<T>(
  skinID: string,
  mode: "wait" | "ifAvailable",
  fn: () => Promise<T>
): Promise<T | "lock-unavailable"> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) {
    // 沒有 Web Locks 的舊瀏覽器：退回無互斥執行。時間圍欄仍在
    // （deltaDeadline），殘餘的跨分頁競態風險已記錄並接受。
    return fn();
  }
  if (mode === "ifAvailable") {
    return locks.request(skinLockName(skinID), { ifAvailable: true }, async (lock) =>
      lock ? await fn() : ("lock-unavailable" as const)
    ) as Promise<T | "lock-unavailable">;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_LOCK_TIMEOUT_MS);
  try {
    return (await locks.request(
      skinLockName(skinID),
      { signal: controller.signal },
      async () => fn()
    )) as T;
  } catch {
    // 等不到鎖（別的分頁佔用過久）：不動任何資料，讓使用者重試
    return "lock-unavailable";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * delta 路徑的時間圍欄：日誌（跨分頁共享）只重放滿 REPAIR_MIN_AGE_MS
 * 的條目，所以 delta 只允許在條目「明顯年輕」時套用——兩者之間留
 * 60 秒的緩衝帶（同一台機器、同一個時鐘），delta 與別的分頁的重數
 * 就不可能碰在同一筆帳上。過了圍欄的條目一律留給冪等的重數處理。
 */
const DELTA_HANDOFF_MARGIN_MS = 60_000;

function deltaDeadline(entry: RepairEntry): number {
  return entry.createdAt + REPAIR_MIN_AGE_MS - DELTA_HANDOFF_MARGIN_MS;
}

export type SubmitRatingResult =
  | {
      outcome: "ok";
      myRating: number;
      /** null＝票已計但彙總沒讀到新值；UI 就地套 delta 樂觀顯示 */
      totals: { ratingCount: number; ratingSum: number } | null;
    }
  | { outcome: "noop"; myRating: number }
  | { outcome: "throttled"; retryAfterSeconds: number }
  | { outcome: "signedOut" }
  | { outcome: "invalid" }
  /** 投票寫入結果不明或彙總更新失敗——票可能已計，請使用者稍後確認 */
  | { outcome: "retry" };

function throttleKey(userRecordName: string, skinID: string): string {
  return `skinRatingThrottle:${userRecordName}:${skinID}`;
}

function throttleRemaining(userRecordName: string, skinID: string): number {
  try {
    const last = Number(localStorage.getItem(throttleKey(userRecordName, skinID)));
    if (!Number.isFinite(last)) return 0;
    return Math.max(0, RATING_THROTTLE_MS - (Date.now() - last));
  } catch {
    return 0;
  }
}

function recordThrottle(userRecordName: string, skinID: string) {
  try {
    localStorage.setItem(throttleKey(userRecordName, skinID), String(Date.now()));
  } catch {
    // localStorage 不可用就退回單分頁節流（無狀態），可接受
  }
}

function decodeAggregate(record: CKJSRecord): SkinAggregate | null {
  const count = record.fields?.ratingCount?.value;
  const sum = record.fields?.ratingSum?.value;
  const skinID = record.fields?.skinID?.value;
  if (
    !record.recordName ||
    typeof count !== "number" ||
    typeof sum !== "number" ||
    typeof skinID !== "string"
  ) {
    return null;
  }
  return {
    recordName: record.recordName,
    recordChangeTag: record.recordChangeTag ?? null,
    skinID,
    ratingCount: count,
    ratingSum: sum,
    createdAt: record.created?.timestamp ?? null,
  };
}

/** 我對這個造型的現有投票（最新一筆；查詢索引落後產生的重複以最新為準） */
export async function fetchMyRating(
  userRecordName: string,
  skinID: string
): Promise<{ record: CKJSRecord; value: number } | null> {
  const records = await queryAllCKJS({
    recordType: "Rating",
    filterBy: [
      {
        fieldName: "userReference",
        comparator: "EQUALS",
        fieldValue: { value: { recordName: userRecordName, action: "NONE" } },
      },
      { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
    ],
    // Rating 沒開排序索引；client 端排（iOS 同樣避開 sortBy）
  });

  let newest: CKJSRecord | null = null;
  for (const record of records) {
    if (typeof record.fields?.ratingValue?.value !== "number") continue;
    if (!newest || (record.created?.timestamp ?? 0) > (newest.created?.timestamp ?? 0)) {
      newest = record;
    }
  }
  return newest
    ? { record: newest, value: newest.fields!.ratingValue!.value as number }
    : null;
}

async function fetchAggregates(skinID: string): Promise<SkinAggregate[]> {
  const records = await queryAllCKJS({
    recordType: "Skin",
    filterBy: [
      { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
    ],
  });
  return records
    .map(decodeAggregate)
    .filter((aggregate): aggregate is SkinAggregate => aggregate !== null);
}

/**
 * 彙總 delta 的 CAS 迴圈：每次都重抓最新值再加 delta，衝突重試。
 * deadlineMs：分頁可能在迴圈中途休眠幾分鐘再醒來——醒來後的重試若
 * 已越過 delta 圍欄（別的分頁的重數可能已把這筆票數進絕對值），
 * 直接放棄回 null，讓日誌條目留給重數。
 */
async function applyAggregateDelta(
  skinID: string,
  targetRecordName: string | null,
  delta: { countDelta: number; sumDelta: number },
  deadlineMs?: number
): Promise<{ ratingCount: number; ratingSum: number } | null> {
  const database = getPublicDatabase();

  for (let attempt = 0; attempt < AGGREGATE_RETRY_LIMIT; attempt += 1) {
    if (deadlineMs !== undefined && Date.now() > deadlineMs) return null;
    let target: CKJSRecord | null = null;

    if (targetRecordName) {
      const fetched = await database.fetchRecords([targetRecordName]);
      target = !fetched.hasErrors ? fetched.records?.[0] ?? null : null;
    }

    if (!target) {
      // 第一票：以固定名稱建立彙總，讓並發的建立者相撞而不是各開一筆
      const created = await database.saveRecords([
        {
          recordType: "Skin",
          recordName: `skin-${skinID}`,
          fields: {
            skinID: { value: skinID },
            ratingCount: { value: 0 },
            ratingSum: { value: 0 },
          },
        },
      ]);
      if (created.hasErrors) {
        // 已存在（別台裝置贏了）→ 重抓現況，改用最舊的那筆
        const existing = mergeAggregates(await fetchAggregates(skinID));
        if (!existing.writeTarget) continue;
        targetRecordName = existing.writeTarget.recordName;
        continue;
      }
      target = created.records[0];
      targetRecordName = target.recordName ?? `skin-${skinID}`;
    }

    const currentCount = (target.fields?.ratingCount?.value as number) ?? 0;
    const currentSum = (target.fields?.ratingSum?.value as number) ?? 0;
    target.fields = {
      ...target.fields,
      ratingCount: { value: currentCount + delta.countDelta },
      ratingSum: { value: currentSum + delta.sumDelta },
    };

    const saved = await database.saveRecords([target]);
    if (!saved.hasErrors) {
      const record = saved.records[0];
      return {
        ratingCount: (record.fields?.ratingCount?.value as number) ?? 0,
        ratingSum: (record.fields?.ratingSum?.value as number) ?? 0,
      };
    }
    // 衝突（別人先寫了）→ 下一圈重抓重試
  }
  return null;
}

/**
 * 送出 1–5 星投票。回傳結果供 UI 樂觀更新；彙總更新失敗時票已計、
 * 顯示值暫時落後（iOS 的 recount 機制會補正整體）。
 */
export async function submitRating(options: {
  userRecordName: string | null;
  skinID: string;
  value: number;
}): Promise<SubmitRatingResult> {
  const { userRecordName, skinID, value } = options;
  if (!userRecordName) return { outcome: "signedOut" };
  if (!Number.isInteger(value) || value < 1 || value > 5) return { outcome: "invalid" };

  const remaining = throttleRemaining(userRecordName, skinID);
  if (remaining > 0) {
    return { outcome: "throttled", retryAfterSeconds: Math.ceil(remaining / 1000) };
  }

  const database = getPublicDatabase();

  // 1. 我的現有投票（決定「新票」或「改票」與 delta；唯讀，鎖外安全）
  const existing = await fetchMyRating(userRecordName, skinID);
  if (existing && existing.value === value) {
    return { outcome: "noop", myRating: value };
  }
  const delta = computeDelta(existing?.value ?? null, value)!;

  // 2–4 整段在這個造型的跨分頁鎖裡：日誌落地 → 投票寫入 → 彙總
  //    delta → 清帳。鎖保證重放的重數絕不會與這段交錯（正確性不再
  //    依賴「日誌條目還在不在」——缺席不是證據，什麼都推不出來）。
  const lockResult = await withSkinLock(skinID, "wait", async (): Promise<SubmitRatingResult> => {
    // 2. 意圖先落地（投票寫入「之前」）：分頁在投票與彙總之間關掉，
    //    下次登入的重放會把欠的帳用重數補正
    const repair: RepairEntry = {
      id: crypto.randomUUID(),
      userRecordName,
      skinID,
      value,
      countDelta: delta.countDelta,
      sumDelta: delta.sumDelta,
      stage: "pre-vote",
      createdAt: Date.now(),
    };
    journalUpsertFor(skinID, repair);

    // 3. 投票寫入。「確定失敗」清掉日誌；「結果不明」留著 pre-vote
    //    條目讓重放去重數。兩者都不動彙總。
    try {
      if (existing) {
        existing.record.fields = {
          ...existing.record.fields,
          ratingValue: { value },
        };
        const saved = await database.saveRecords([existing.record]);
        if (saved.hasErrors) {
          journalRemoveFor(skinID, repair.id);
          return { outcome: "retry" };
        }
      } else {
        const saved = await database.saveRecords([
          {
            recordType: "Rating",
            recordName: crypto.randomUUID(),
            fields: {
              userReference: { value: { recordName: userRecordName, action: "NONE" } },
              skinID: { value: skinID },
              ratingValue: { value },
            },
          },
        ]);
        if (saved.hasErrors) {
          journalRemoveFor(skinID, repair.id);
          return { outcome: "retry" };
        }
      }
    } catch {
      // 結果不明：日誌保持 pre-vote，交給重放重數
      return { outcome: "retry" };
    }

    // 票已計：日誌進入「只欠彙總」階段
    journalUpsertFor(skinID, { ...repair, stage: "vote-committed" });
    recordThrottle(userRecordName, skinID);

    // 4. 彙總 delta（寫入目標＝最舊 record；CAS 重試）。
    //    時間圍欄只為「沒有 Web Locks 的舊瀏覽器」而留：有鎖時重數
    //    根本進不來，圍欄形同虛設也無害。
    if (Date.now() > deltaDeadline(repair)) {
      return { outcome: "ok", myRating: value, totals: null };
    }
    try {
      const aggregates = mergeAggregates(await fetchAggregates(skinID));
      const totals = await applyAggregateDelta(
        skinID,
        aggregates.writeTarget?.recordName ?? null,
        delta,
        deltaDeadline(repair)
      );
      if (totals) {
        journalRemoveFor(skinID, repair.id);
        // 顯示值＝所有重複 record 的加總；目標以外的部分不變
        const othersCount =
          aggregates.ratingCount - (aggregates.writeTarget?.ratingCount ?? 0);
        const othersSum = aggregates.ratingSum - (aggregates.writeTarget?.ratingSum ?? 0);
        return {
          outcome: "ok",
          myRating: value,
          totals: {
            ratingCount: othersCount + totals.ratingCount,
            ratingSum: othersSum + totals.ratingSum,
          },
        };
      }
    } catch {
      // 票已計、彙總沒跟上：日誌留著（vote-committed），重放會重數
    }
    return { outcome: "ok", myRating: value, totals: null };
  });

  if (lockResult === "lock-unavailable") return { outcome: "retry" };
  return lockResult;
}

// ---------- 重放（登入後由 CloudKitProvider 觸發） ----------

let replayInFlight = false;

/**
 * 全量重數（iOS rebuildAggregate 的移植）：從該造型的所有 Rating
 * record 重新導出 count/sum（同一使用者取最新一票），重複的彙總
 * record 先歸零，再把絕對值寫進最舊的目標。
 * 重數是冪等的定點——這正是它取代「直接補 delta」的原因。
 *
 * 順序是正確性所在：彙總「先」抓（連同 changeTag），票「後」查，
 * 存檔帶著一開始抓到的 changeTag——任何在「讀票→算→寫」窗口裡落地
 * 的並發 delta 都會改變 changeTag，把我們打回重跑「整個」序列
 * （重抓彙總、重查票、重算）。先查票再抓彙總的話，並發那票的 delta
 * 會被算好的舊絕對值安靜蓋掉。
 */
async function recountAggregate(skinID: string): Promise<boolean> {
  const database = getPublicDatabase();

  for (let attempt = 0; attempt < AGGREGATE_RETRY_LIMIT; attempt += 1) {
    // 1. 先抓彙總 record（原始物件保留 changeTag，守住整個讀算寫窗口）
    const aggregateRecords = await queryAllCKJS({
      recordType: "Skin",
      filterBy: [
        { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
      ],
    });
    const decoded = aggregateRecords
      .map(decodeAggregate)
      .filter((aggregate): aggregate is SkinAggregate => aggregate !== null);
    const sorted = oldestFirst(decoded);
    const rawByName = new Map(
      aggregateRecords
        .filter((record) => record.recordName)
        .map((record) => [record.recordName!, record])
    );

    // 2. 再查所有票、算絕對值（頂級造型 7 千多票 ≈ 37 頁；到頂會
    //    丟例外 → 本輪放棄不寫入，絕不拿半套清單覆蓋計數器）
    const votes = await queryAllCKJS(
      {
        recordType: "Rating",
        filterBy: [
          { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
        ],
      },
      { maxPages: 250 }
    );
    // 一人一票：ambiguous retry 可能留下重複的 Rating，最新的那票才算
    const newestPerUser = new Map<string, { value: number; timestamp: number }>();
    for (const record of votes) {
      const reference = record.fields?.userReference?.value as
        | { recordName?: string }
        | undefined;
      const value = record.fields?.ratingValue?.value;
      if (!reference?.recordName || typeof value !== "number") continue;
      const timestamp = record.created?.timestamp ?? 0;
      const existing = newestPerUser.get(reference.recordName);
      if (!existing || timestamp > existing.timestamp) {
        newestPerUser.set(reference.recordName, { value, timestamp });
      }
    }
    const count = newestPerUser.size;
    let sum = 0;
    for (const vote of newestPerUser.values()) sum += vote.value;

    // 從沒有彙總 record：以固定名稱建立（已存在＝並發建立 → 整輪重跑）
    if (sorted.length === 0) {
      const created = await database.saveRecords([
        {
          recordType: "Skin",
          recordName: `skin-${skinID}`,
          fields: {
            skinID: { value: skinID },
            ratingCount: { value: count },
            ratingSum: { value: sum },
          },
        },
      ]);
      if (!created.hasErrors) return true;
      continue;
    }

    // 3. 歸零重複的（帶步驟 1 的 changeTag；衝突＝有人動過 → 整輪重跑）
    let conflicted = false;
    for (const duplicate of sorted.slice(1)) {
      if (duplicate.ratingCount === 0 && duplicate.ratingSum === 0) continue;
      const raw = rawByName.get(duplicate.recordName);
      if (!raw) {
        conflicted = true;
        break;
      }
      raw.fields = {
        ...raw.fields,
        ratingCount: { value: 0 },
        ratingSum: { value: 0 },
      };
      const saved = await database.saveRecords([raw]);
      if (saved.hasErrors) {
        conflicted = true;
        break;
      }
    }
    if (conflicted) continue;

    // 4. 目標寫絕對值（同樣帶步驟 1 的 changeTag）
    const targetRaw = rawByName.get(sorted[0].recordName);
    if (!targetRaw) continue;
    targetRaw.fields = {
      ...targetRaw.fields,
      ratingCount: { value: count },
      ratingSum: { value: sum },
    };
    const saved = await database.saveRecords([targetRaw]);
    if (!saved.hasErrors) return true;
    // 衝突 → 重跑整個序列
  }
  return false;
}

/**
 * 重放修復日誌：對每個留有欠帳的造型做一次全量重數，成功才移除該
 * 造型的所有條目。條目要滿 REPAIR_MIN_AGE_MS 才碰——一方面避開同分頁
 * 還在跑的 submit，一方面等 CloudKit 最終一致的查詢索引把剛落地的
 * 票收進來（太早重數會少算別人剛投的票）。失敗留到下次登入再試；
 * 重數冪等，重試無害。
 */
export async function replaySkinRatingRepairs(userRecordName: string): Promise<void> {
  if (replayInFlight) return;
  replayInFlight = true;
  try {
    for (const skinID of journaledSkinIDs()) {
      try {
        await withSkinLock(skinID, "ifAvailable", async () => {
          // 鎖內重讀：排隊期間 submit 可能已完成並清帳
          const due = readJournalFor(skinID).filter(
            (entry) =>
              entry.userRecordName === userRecordName &&
              Date.now() - entry.createdAt > REPAIR_MIN_AGE_MS
          );
          if (due.length === 0) return;
          if (await recountAggregate(skinID)) {
            for (const entry of due) journalRemoveFor(skinID, entry.id);
          }
        });
        // "lock-unavailable"（別的分頁抱著鎖）→ 跳過，下次登入再修
      } catch {
        // 這個造型先留著，下次登入再試
      }
    }
  } finally {
    replayInFlight = false;
  }
}
