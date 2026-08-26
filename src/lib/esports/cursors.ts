// 留言分頁的 keyset cursor filter（PostgREST or= 語法）。
// 與 iOS EsportsRatingService 的字串逐字元一致——這是 wire 契約，
// 不是風格選擇；測試以字串相等驗證。

import { timestampQueryValue } from "@/lib/esports/timestamps";
import type { HeatCursor, NewestCursor } from "@/lib/esports/types";

/**
 * 最新排序（created_at desc, id desc）的下一頁條件：
 * created_at 較舊，或同時間戳但 id 較小。
 */
export function newestCursorFilter(cursor: NewestCursor): string {
  const ts = timestampQueryValue(cursor.createdAtRaw);
  return (
    `created_at.lt."${ts}"` +
    `,and(created_at.eq."${ts}",id.lt."${cursor.id}")`
  );
}

/**
 * 熱門排序（like_count desc, created_at desc, comment_id desc）的三鍵條件。
 * like_count 是會變動的 key：頁與頁之間讚數變了會漏或重，客戶端以 id
 * 去重、下拉刷新收斂（設計上接受的取捨）。
 */
export function heatCursorFilter(cursor: HeatCursor): string {
  const ts = timestampQueryValue(cursor.createdAtRaw);
  return (
    `like_count.lt.${cursor.likeCount}` +
    `,and(like_count.eq.${cursor.likeCount},created_at.lt."${ts}")` +
    `,and(like_count.eq.${cursor.likeCount},created_at.eq."${ts}",comment_id.lt."${cursor.id}")`
  );
}
