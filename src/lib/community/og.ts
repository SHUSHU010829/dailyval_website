// 社群貼文 OG 圖的輔助函式（route 與 generateMetadata 共用）。

import { MEDIA_BASE_URL } from "@/lib/community/constants";
import { isMigratedKey } from "@/lib/community/mapping";
import type { SocialPost } from "@/lib/community/types";

/** 貼文頁 metadata 裡的 og:image 路徑（相對路徑，由 metadataBase 補成絕對網址） */
export function communityOgPath(id: string, locale: string): string {
  return `/og/community-post?${new URLSearchParams({ id, locale }).toString()}`;
}

/**
 * OG 卡上可以內嵌的第一張圖，沒有就回 null。
 * - 只接受我們自己的媒體網域：卡片渲染時 Satori 會去抓這個網址，不能讓它被
 *   導向任意主機
 * - 搬移過來的舊圖不用：它們的格式不保證 Satori 能解，一張壞圖會讓整張卡渲染失敗
 */
export function ogImageFor(post: SocialPost): string | null {
  const image = post.images[0];
  if (!image || isMigratedKey(image.key)) return null;
  try {
    const allowedHost = new URL(MEDIA_BASE_URL).host;
    return new URL(image.thumbURL).host === allowedHost ? image.thumbURL : null;
  } catch {
    return null;
  }
}
