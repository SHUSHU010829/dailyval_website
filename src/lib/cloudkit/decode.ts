// CloudKit record → domain 的解碼（純函數，可單元測試）。
// 嚴格程度比照 iOS：語意欄位缺一即整筆丟棄（iOS 的 from(record:) 會
// drop，網頁渲染了 App 看不到的資料反而造成兩端不一致）。唯一放寬的
// 是 likedUserIDs：CKRecord 的空陣列經過 wire 可能整個欄位消失，缺席
// 視為零讚，不丟棄留言。

import type { CKFieldValue, CKRecord, SkinAggregate, SkinCommentData } from "@/lib/cloudkit/types";

function stringField(field: CKFieldValue | undefined): string | null {
  return typeof field?.value === "string" ? field.value : null;
}

function intField(field: CKFieldValue | undefined): number | null {
  return typeof field?.value === "number" && Number.isFinite(field.value)
    ? field.value
    : null;
}

/** CloudKit 的布林欄位在 wire 上是 INT64 0/1 */
function boolField(field: CKFieldValue | undefined): boolean | null {
  const value = intField(field);
  return value === null ? null : value !== 0;
}

function stringListField(field: CKFieldValue | undefined): string[] | null {
  if (!Array.isArray(field?.value)) return null;
  return field.value.every((item) => typeof item === "string")
    ? (field.value as string[])
    : null;
}

export function decodeSkinAggregate(record: CKRecord): SkinAggregate | null {
  const fields = record.fields ?? {};
  const skinID = stringField(fields.skinID);
  const ratingCount = intField(fields.ratingCount);
  const ratingSum = intField(fields.ratingSum);
  if (!record.recordName || skinID === null || ratingCount === null || ratingSum === null) {
    return null;
  }
  return {
    recordName: record.recordName,
    recordChangeTag: record.recordChangeTag ?? null,
    skinID,
    ratingCount,
    ratingSum,
    createdAt: record.created?.timestamp ?? null,
  };
}

export function decodeSkinComment(record: CKRecord): SkinCommentData | null {
  const fields = record.fields ?? {};
  const skinID = stringField(fields.skinID);
  const text = stringField(fields.text);
  const userID = stringField(fields.userID);
  const userName = stringField(fields.userName);
  const tagLine = stringField(fields.tagLine);
  const userImage = stringField(fields.userImage);
  const rankTier = intField(fields.rankTier);
  const createdAt = record.created?.timestamp;

  if (
    !record.recordName ||
    skinID === null ||
    text === null ||
    userID === null ||
    userName === null ||
    tagLine === null ||
    userImage === null ||
    rankTier === null ||
    typeof createdAt !== "number"
  ) {
    return null;
  }

  return {
    id: record.recordName,
    skinID,
    text,
    likedUserIDs: stringListField(fields.likedUserIDs) ?? [],
    userID,
    userName,
    tagLine,
    userImage,
    rankTier,
    isVerify: boolField(fields.isVerify),
    isPremium: boolField(fields.isPremium),
    createdAt,
  };
}
