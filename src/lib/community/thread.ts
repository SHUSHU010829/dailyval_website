// 討論串的分頁狀態，抽成純函式好測。
//
// 兩份清單分開放：`pages` 是伺服器一頁一頁送來的（由舊到新），`local` 是這個
// 觀看者剛送出、還沒從伺服器讀回來的留言。下一頁的游標只能取自 `pages` 的
// 最後一列——留言是「往後翻」的 keyset 分頁（created_at, id 嚴格大於），拿剛
// 送出的留言當游標會把它之前還沒載入的整段永遠跳過。

import type { FeedCursor, SocialComment } from "@/lib/community/types";

export interface ThreadState {
  pages: SocialComment[];
  local: SocialComment[];
  hasMore: boolean;
}

export const emptyThread: ThreadState = {
  pages: [],
  local: [],
  hasMore: false,
};

/** 伺服器的一頁接到後面；伺服器已經回傳的本地留言從 local 拿掉 */
export function appendPage(
  state: ThreadState,
  page: SocialComment[],
  pageSize: number,
): ThreadState {
  const known = new Set(state.pages.map((comment) => comment.id));
  const fresh = page.filter((comment) => !known.has(comment.id));
  const arrived = new Set(fresh.map((comment) => comment.id));
  return {
    pages: [...state.pages, ...fresh],
    local: state.local.filter((comment) => !arrived.has(comment.id)),
    hasMore: page.length >= pageSize,
  };
}

/** 剛送出的留言：接在所有已載入的內容後面 */
export function addLocal(
  state: ThreadState,
  comment: SocialComment,
): ThreadState {
  if (
    state.pages.some((item) => item.id === comment.id) ||
    state.local.some((item) => item.id === comment.id)
  ) {
    return state;
  }
  return { ...state, local: [...state.local, comment] };
}

export function removeComment(state: ThreadState, id: string): ThreadState {
  return {
    ...state,
    pages: state.pages.filter((comment) => comment.id !== id),
    local: state.local.filter((comment) => comment.id !== id),
  };
}

/** 封鎖了某位作者：這串裡他的留言一起收掉（伺服器下次讀就不會再給） */
export function removeByAuthor(
  state: ThreadState,
  authorId: string,
): ThreadState {
  return {
    ...state,
    pages: state.pages.filter((comment) => comment.author.id !== authorId),
    local: state.local.filter((comment) => comment.author.id !== authorId),
  };
}

/** 下一頁從哪裡開始：伺服器頁面的最後一列，沒有就是從頭 */
export function nextCursor(state: ThreadState): FeedCursor | null {
  const last = state.pages[state.pages.length - 1];
  return last ? { createdAt: last.createdAt, id: last.id } : null;
}

export function visibleComments(state: ThreadState): SocialComment[] {
  return state.local.length === 0
    ? state.pages
    : [...state.pages, ...state.local];
}
