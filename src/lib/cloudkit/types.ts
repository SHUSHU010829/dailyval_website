// CloudKit Web Services 的 wire 型別＋造型評分的 domain 型別。
// wire 格式與 dailyval_social 既有的 proxy 相同（records/query、records/lookup）。
// domain 契約以 iOS 為準：
// - Skin（彙總）：DailyVal/Rating/Model/SkinRatingModels.swift
// - SkinComment：DailyVal/Rating/Model/SkinCommentModel.swift

/** CloudKit 欄位值。type 送出時可省略（伺服器依 schema 推斷） */
export interface CKFieldValue {
  value: unknown;
  type?: string;
}

/** CloudKit REST 回傳的 record（僅含這裡會用到的欄位） */
export interface CKRecord {
  recordName: string;
  recordType?: string;
  fields?: Record<string, CKFieldValue | undefined>;
  recordChangeTag?: string;
  created?: { timestamp?: number };
  modified?: { timestamp?: number };
  /** 查無 record 時 lookup 會逐筆回錯誤而非整體失敗 */
  serverErrorCode?: string;
  reason?: string;
}

export interface CKQueryFilter {
  fieldName: string;
  comparator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "GREATER_THAN_OR_EQUALS" | "LESS_THAN" | "LESS_THAN_OR_EQUALS" | "IN";
  fieldValue: CKFieldValue;
}

export interface CKQuerySort {
  /** 系統欄位用 ___createTime（建立時間，遞減＝最新在前） */
  fieldName: string;
  ascending: boolean;
}

export interface CKQueryRequest {
  recordType: string;
  filterBy?: CKQueryFilter[];
  sortBy?: CKQuerySort[];
}

// ---------- Domain ----------

/**
 * Skin 彙總 record（recordType "Skin"）。
 * 新 record 名稱固定為 `skin-<skinID>`，但歷史資料有隨機名稱的重複
 * record：顯示時全部加總、寫入時鎖定最舊一筆（見 lib/ratings/aggregate.ts）。
 */
export interface SkinAggregate {
  recordName: string;
  recordChangeTag: string | null;
  skinID: string;
  ratingCount: number;
  ratingSum: number;
  /** record 建立時間（epoch ms）；選寫入目標用 */
  createdAt: number | null;
}

/**
 * 造型留言（recordType "SkinComment"）。
 * 作者欄位是發文當下的 Riot 帳號快照；userID 是 Riot puuid（小寫
 * UUID），僅供身分判斷，不可顯示。
 */
export interface SkinCommentData {
  id: string;
  skinID: string;
  text: string;
  likedUserIDs: string[];
  userID: string;
  userName: string;
  tagLine: string;
  userImage: string;
  rankTier: number;
  isVerify: boolean | null;
  isPremium: boolean | null;
  /** epoch ms；record 的建立時間 */
  createdAt: number;
}
