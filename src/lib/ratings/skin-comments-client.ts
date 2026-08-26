// 造型留言的瀏覽器端寫入層（CloudKit JS，以登入者身分）。
// 契約承襲 iOS SkinCommentViewModel／SkinCommentModel：
// - 建立時「每個欄位都要寫」（iOS 的 from(record:) 缺任一語意欄位就
//   整筆丟棄；空字串／空陣列也要寫，不能省略）
// - 作者快照來自 Users record：userID＝riotID（Riot puuid）、名稱、
//   tagLine、playercard 圖 URL、牌位、驗證／付費旗標
// - 按讚＝抓最新 record → 在 likedUserIDs 裡 toggle 我的 riotID →
//   CAS 儲存，衝突重試 ≤3
// - 刪除限作者本人（client 檢查 userID，CloudKit 的 creator ACL 在
//   伺服器端兜底）
// - 每造型 30 秒留言冷卻（iOS 同值）

import { getPublicDatabase, type CKJSRecord } from "@/lib/ratings/cloudkit-js";
import { SKIN_WRITES_ENABLED } from "@/lib/ratings/flags";
import { decodeSkinComment } from "@/lib/cloudkit/decode";
import type { CKRecord, SkinCommentData, UsersProfile } from "@/lib/cloudkit/types";

const COMMENT_COOLDOWN_MS = 30_000;
const LIKE_RETRY_LIMIT = 3;
export const COMMENT_TEXT_LIMIT = 500;

export type CommentWriteResult<T> =
  | { outcome: "ok"; value: T }
  | { outcome: "throttled"; retryAfterSeconds: number }
  | { outcome: "invalid" }
  | { outcome: "failed" };

function cooldownKey(skinID: string): string {
  return `skinCommentCooldown:${skinID}`;
}

function cooldownRemaining(skinID: string): number {
  try {
    const last = Number(localStorage.getItem(cooldownKey(skinID)));
    if (!Number.isFinite(last)) return 0;
    return Math.max(0, COMMENT_COOLDOWN_MS - (Date.now() - last));
  } catch {
    return 0;
  }
}

/** 發佈留言。回傳解碼後的資料供樂觀插入。 */
export async function submitComment(options: {
  skinID: string;
  text: string;
  profile: UsersProfile;
}): Promise<CommentWriteResult<SkinCommentData>> {
  const { skinID, profile } = options;
  // 防禦性凍結檢查（Supabase 遷移期；UI 已隱藏，這裡兜底）
  if (!SKIN_WRITES_ENABLED) return { outcome: "failed" };
  const text = options.text.trim();
  if (!profile.riotID || text.length === 0 || text.length > COMMENT_TEXT_LIMIT) {
    return { outcome: "invalid" };
  }
  const remaining = cooldownRemaining(skinID);
  if (remaining > 0) {
    return { outcome: "throttled", retryAfterSeconds: Math.ceil(remaining / 1000) };
  }

  const record: CKJSRecord = {
    recordType: "SkinComment",
    recordName: crypto.randomUUID(),
    fields: {
      skinID: { value: skinID },
      text: { value: text },
      likedUserIDs: { value: [] },
      userID: { value: profile.riotID },
      userName: { value: profile.gameName },
      tagLine: { value: profile.tagLine },
      userImage: { value: profile.userImage },
      rankTier: { value: profile.rankTier },
      isVerify: { value: profile.isVerify ? 1 : 0 },
      isPremium: { value: profile.isPremium ? 1 : 0 },
    },
  };

  try {
    const saved = await getPublicDatabase().saveRecords([record]);
    if (saved.hasErrors) return { outcome: "failed" };
    try {
      localStorage.setItem(cooldownKey(skinID), String(Date.now()));
    } catch {
      // localStorage 不可用就只剩單分頁節流
    }
    const decoded = decodeSkinComment(saved.records[0] as unknown as CKRecord);
    if (decoded) return { outcome: "ok", value: decoded };
    // 伺服器沒回完整欄位就用本地構造（欄位齊全，時間取現在）
    return {
      outcome: "ok",
      value: {
        id: record.recordName!,
        skinID,
        text,
        likedUserIDs: [],
        userID: profile.riotID,
        userName: profile.gameName,
        tagLine: profile.tagLine,
        userImage: profile.userImage,
        rankTier: profile.rankTier,
        isVerify: profile.isVerify,
        isPremium: profile.isPremium,
        createdAt: Date.now(),
      },
    };
  } catch {
    return { outcome: "failed" };
  }
}

/**
 * 按讚 toggle（讀最新 → 改 likedUserIDs → CAS 存，衝突重試）。
 * 回傳最新的 likedUserIDs；留言已被刪回 failed。
 */
export async function toggleCommentLike(options: {
  commentID: string;
  riotID: string;
}): Promise<CommentWriteResult<string[]>> {
  if (!SKIN_WRITES_ENABLED) return { outcome: "failed" };
  const database = getPublicDatabase();
  for (let attempt = 0; attempt < LIKE_RETRY_LIMIT; attempt += 1) {
    try {
      const fetched = await database.fetchRecords([options.commentID]);
      const record = fetched.records?.[0];
      if (fetched.hasErrors || !record?.fields) return { outcome: "failed" };

      const current = Array.isArray(record.fields.likedUserIDs?.value)
        ? (record.fields.likedUserIDs!.value as string[])
        : [];
      const next = current.includes(options.riotID)
        ? current.filter((id) => id !== options.riotID)
        : [...current, options.riotID];
      record.fields = { ...record.fields, likedUserIDs: { value: next } };

      const saved = await database.saveRecords([record]);
      if (!saved.hasErrors) return { outcome: "ok", value: next };
      // 衝突（別人同時按）→ 重抓重試
    } catch {
      return { outcome: "failed" };
    }
  }
  return { outcome: "failed" };
}

/** 刪除自己的留言（呼叫端先驗過 userID；creator ACL 在伺服器端兜底） */
export async function deleteOwnComment(commentID: string): Promise<boolean> {
  if (!SKIN_WRITES_ENABLED) return false;
  try {
    const result = await getPublicDatabase().deleteRecords([commentID]);
    return !result.hasErrors;
  } catch {
    return false;
  }
}
