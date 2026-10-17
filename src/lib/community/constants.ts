// 社群板的常數。Supabase 的 URL / key 與官網其他功能共用（見 @/lib/esports/constants）。
//
// 圖片網址用 `||` 而不是 `??`：.env.example 留白的那幾行是空字串，
// `??` 不會退回預設。

import { playerCardSmallArtURL } from "@/lib/esports/constants";

export { playerCardSmallArtURL };

export function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/** R2 公開網址；貼文圖片的 key 直接接在後面（永久網址，不再重簽） */
export const MEDIA_BASE_URL = envOr(
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  "https://img.dailyval.com",
).replace(/\/+$/, "");

/** 動態牆一頁的筆數（伺服器上限 50） */
export const FEED_PAGE_SIZE = 20;
/** 討論串一頁的筆數（伺服器上限 100） */
export const COMMENTS_PAGE_SIZE = 50;

/** 與伺服器 create_post / create_comment 的長度檢查同值 */
export const POST_CHAR_LIMIT = 1000;
export const COMMENT_CHAR_LIMIT = 500;
/** 一篇貼文最多幾張圖（social.post_images 的 position 0..4） */
export const POST_IMAGE_LIMIT = 5;
