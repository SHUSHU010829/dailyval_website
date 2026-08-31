// 「這一列該顯示什麼」的判斷。抽出來是因為它踩過一個很安靜的錯：用 body 是
// 不是空的去推斷內容還在不在。
//
// 空字串是一篇**存在的**貼文的合法內容——正式庫有 109 篇 body = ''，其中一篇
// 被檢舉而且沒有圖。舊的寫法會對那一篇說「內容已不存在」，也就是把一個活著的
// 目標報成已經刪掉了，而審核的人會照著那句話決定不處理。
//
// 存在與否只有伺服器知道，所以由 content_exists 回答；body 和 images 只回答
// 「有什麼可以看」。

export interface ContentShape {
  content_exists: boolean;
  body: string | null;
  images: { key: string }[];
}

/**
 * 內文旁邊要不要補一句說明，補什麼。
 * 回 null 代表有內文可以直接畫，不需要說明。
 */
export function contentSummary(row: ContentShape): string | null {
  if (!row.content_exists) return "（內容已不存在）";
  if (row.body && row.body.trim()) return null;
  if (row.images.length > 0) return "（只有圖片，沒有內文）";
  return "（這篇是空的：沒有內文也沒有圖片）";
}
