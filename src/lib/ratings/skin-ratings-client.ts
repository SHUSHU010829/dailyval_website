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
import { computeDelta, mergeAggregates } from "@/lib/ratings/aggregate";
import type { SkinAggregate } from "@/lib/cloudkit/types";

/** 每 (使用者, 造型) 30 秒的投票節流（iOS 同值；localStorage 跨分頁生效） */
const RATING_THROTTLE_MS = 30_000;
const AGGREGATE_RETRY_LIMIT = 3;

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

  // 2. 投票寫入。失敗（含結果不明）就到此為止——絕不在票況不明時動彙總
  try {
    if (existing) {
      existing.record.fields = {
        ...existing.record.fields,
        ratingValue: { value },
      };
      const saved = await database.saveRecords([existing.record]);
      if (saved.hasErrors) return { outcome: "retry" };
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
      if (saved.hasErrors) return { outcome: "retry" };
    }
  } catch {
    return { outcome: "retry" };
  }

  recordThrottle(userRecordName, skinID);

  // 3. 彙總 delta（寫入目標＝最舊 record；CAS 重試）
  try {
    const aggregates = mergeAggregates(await fetchAggregates(skinID));
    const totals = await applyAggregateDelta(
      skinID,
      aggregates.writeTarget?.recordName ?? null,
      delta
    );
    if (totals) {
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
    // 票已計、彙總沒跟上：交給 iOS 的 recount 收斂
  }
  return { outcome: "ok", myRating: value, totals: null };
}
