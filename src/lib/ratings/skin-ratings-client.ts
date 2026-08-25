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

const REPAIR_JOURNAL_KEY = "skinRatingRepairJournal";
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

function readJournal(): RepairEntry[] {
  try {
    const raw = localStorage.getItem(REPAIR_JOURNAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RepairEntry[]) : [];
  } catch {
    return [];
  }
}

function writeJournal(entries: RepairEntry[]) {
  try {
    localStorage.setItem(REPAIR_JOURNAL_KEY, JSON.stringify(entries));
  } catch {
    // localStorage 不可用：退化成沒有日誌（與修復前相同，不擋投票）
  }
}

function journalUpsert(entry: RepairEntry) {
  writeJournal([...readJournal().filter((existing) => existing.id !== entry.id), entry]);
}

function journalRemove(entryID: string) {
  writeJournal(readJournal().filter((existing) => existing.id !== entryID));
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

/** 彙總 delta 的 CAS 迴圈：每次都重抓最新值再加 delta，衝突重試 */
async function applyAggregateDelta(
  skinID: string,
  targetRecordName: string | null,
  delta: { countDelta: number; sumDelta: number }
): Promise<{ ratingCount: number; ratingSum: number } | null> {
  const database = getPublicDatabase();

  for (let attempt = 0; attempt < AGGREGATE_RETRY_LIMIT; attempt += 1) {
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

  // 1. 我的現有投票（決定「新票」或「改票」與 delta）
  const existing = await fetchMyRating(userRecordName, skinID);
  if (existing && existing.value === value) {
    return { outcome: "noop", myRating: value };
  }
  const delta = computeDelta(existing?.value ?? null, value)!;

  // 2. 意圖先落地（投票寫入「之前」）：分頁在投票與彙總之間關掉，
  //    下次登入的重放會把欠的 delta 補上
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
  journalUpsert(repair);

  // 3. 投票寫入。「確定失敗」清掉日誌；「結果不明」留著 pre-vote
  //    條目讓重放去驗證票有沒有落地。兩者都不動彙總。
  try {
    if (existing) {
      existing.record.fields = {
        ...existing.record.fields,
        ratingValue: { value },
      };
      const saved = await database.saveRecords([existing.record]);
      if (saved.hasErrors) {
        journalRemove(repair.id);
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
        journalRemove(repair.id);
        return { outcome: "retry" };
      }
    }
  } catch {
    // 結果不明：日誌保持 pre-vote，交給重放判定
    return { outcome: "retry" };
  }

  // 票已計：日誌進入「只欠彙總」階段
  journalUpsert({ ...repair, stage: "vote-committed" });
  recordThrottle(userRecordName, skinID);

  // 4. 彙總 delta（寫入目標＝最舊 record；CAS 重試）
  try {
    const aggregates = mergeAggregates(await fetchAggregates(skinID));
    const totals = await applyAggregateDelta(
      skinID,
      aggregates.writeTarget?.recordName ?? null,
      delta
    );
    if (totals) {
      journalRemove(repair.id);
      // 顯示值＝所有重複 record 的加總；目標以外的部分不變
      const othersCount = aggregates.ratingCount - (aggregates.writeTarget?.ratingCount ?? 0);
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
    // 票已計、彙總沒跟上：日誌留著（vote-committed），重放會補
  }
  return { outcome: "ok", myRating: value, totals: null };
}

// ---------- 重放（登入後由 CloudKitProvider 觸發） ----------

let replayInFlight = false;

/**
 * 全量重數（iOS rebuildAggregate 的移植）：從該造型的所有 Rating
 * record 重新導出 count/sum（同一使用者取最新一票），重複的彙總
 * record 先歸零，再把絕對值寫進最舊的目標。
 * 重數是冪等的定點——這正是它取代「直接補 delta」的原因：delta
 * 重放無法分辨「已套用過」與「同分數的另一次寫入」，重數天生分得清。
 */
async function recountAggregate(skinID: string): Promise<boolean> {
  const votes = await queryAllCKJS({
    recordType: "Rating",
    filterBy: [
      { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
    ],
  });

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

  const database = getPublicDatabase();
  const aggregates = mergeAggregates(await fetchAggregates(skinID));

  /** 抓最新 record → 設絕對值 → CAS 存（衝突重抓重試） */
  const casWriteAbsolute = async (
    recordName: string,
    absoluteCount: number,
    absoluteSum: number
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < AGGREGATE_RETRY_LIMIT; attempt += 1) {
      const fetched = await database.fetchRecords([recordName]);
      const record = fetched.records?.[0];
      if (fetched.hasErrors || !record?.fields) return false;
      record.fields = {
        ...record.fields,
        ratingCount: { value: absoluteCount },
        ratingSum: { value: absoluteSum },
      };
      const saved = await database.saveRecords([record]);
      if (!saved.hasErrors) return true;
    }
    return false;
  };

  if (!aggregates.writeTarget) {
    // 從沒有彙總 record：以固定名稱建立後寫入絕對值
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
    // 已存在（並發建立）→ 走一般路徑
    const refreshed = mergeAggregates(await fetchAggregates(skinID));
    if (!refreshed.writeTarget) return false;
    return casWriteAbsolute(refreshed.writeTarget.recordName, count, sum);
  }

  // 先歸零重複的（iOS 同一順序），再把總數寫進最舊的目標
  const sorted = oldestFirst(
    (await fetchAggregates(skinID)) // 重抓一次拿最新 changeTag
  );
  for (const duplicate of sorted.slice(1)) {
    if (duplicate.ratingCount === 0 && duplicate.ratingSum === 0) continue;
    if (!(await casWriteAbsolute(duplicate.recordName, 0, 0))) return false;
  }
  return casWriteAbsolute(sorted[0]?.recordName ?? aggregates.writeTarget.recordName, count, sum);
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
    const entries = readJournal().filter(
      (entry) =>
        entry.userRecordName === userRecordName &&
        Date.now() - entry.createdAt > REPAIR_MIN_AGE_MS
    );
    const skinIDs = [...new Set(entries.map((entry) => entry.skinID))];
    for (const skinID of skinIDs) {
      try {
        if (await recountAggregate(skinID)) {
          for (const entry of entries.filter((candidate) => candidate.skinID === skinID)) {
            journalRemove(entry.id);
          }
        }
      } catch {
        // 這個造型先留著，下次登入再試
      }
    }
  } finally {
    replayInFlight = false;
  }
}
