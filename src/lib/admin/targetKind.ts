// 檢舉與處置的「目標種類」。跟資料庫的 social.target_kind enum 一一對應，
// 伺服器驗證、型別、畫面上的標籤都從這一份來，免得哪一邊又寫成
// 「不是貼文就是留言」：那樣一個新種類會被悄悄標成「留言」。
//
// 這裡沒有 `server-only` 也沒有 "use client"：route 和後台畫面都要用它，
// 而它一個機密都不碰。

export const TARGET_KINDS = [
  "post",
  "comment",
  "room",
  "skin_comment",
  "esports_comment",
] as const;

export type TargetKind = (typeof TARGET_KINDS)[number];

const LABELS: Record<TargetKind, string> = {
  post: "貼文",
  comment: "留言",
  room: "房間",
  // App 裡武器造型頁下面的留言。
  skin_comment: "造型留言",
  // 職業比賽評分頁下面的留言。
  esports_comment: "電競留言",
};

export function isTargetKind(value: unknown): value is TargetKind {
  return typeof value === "string" && (TARGET_KINDS as readonly string[]).includes(value);
}

/** 認不得的種類原樣顯示，不要猜成「留言」。 */
export function targetKindLabel(kind: string): string {
  return isTargetKind(kind) ? LABELS[kind] : kind;
}

/**
 * 下架之後能不能恢復。房間的「下架」就是關房，而那個 party 已經不在了，
 * 伺服器會拒絕重開（admin_set_hidden 對 room + false 丟 22023）。與其讓
 * 按鈕按下去才失敗，不如不給按。
 */
export function canUnhide(kind: TargetKind): boolean {
  return kind !== "room";
}

/** 下架狀態的說法。房間的 is_hidden 是 status = closed，房主自己關的也算，所以不能叫「下架」。 */
export function hiddenLabel(kind: TargetKind): string {
  return kind === "room" ? "已關閉" : "已下架";
}

/** 「下架並結案」按鈕上的字。對房間來說那個動作就是關房。 */
export function hideActionLabel(kind: TargetKind): string {
  return kind === "room" ? "關閉房間並結案" : "下架並結案";
}
