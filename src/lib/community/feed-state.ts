// 動態牆／個人頁的分頁狀態，抽成純函式好測（取代來源專案的 SWR）。
//
// 同一頁對不同觀看者是不同結果（我按過讚沒有、封鎖過濾），所以每份資料都記著
// 「它是誰的」。幾條硬規則（來源分支 review 第 1–5 輪修出來的）：
// - SSR 首屏是匿名視角，登入者一定要重讀，不能把它當成自己的動態牆
// - 登入者的重讀失敗時，畫面上若還是匿名首屏就整個不顯示（fail-closed）
// - 匿名首屏不能被複製成登入者的快取（會把他封鎖的作者一起複製進去）
// - 換了觀看者，前一位觀看者的內容立刻不再顯示

import { FEED_PAGE_SIZE } from "@/lib/community/constants";
import type { SocialPost } from "@/lib/community/types";

/** SSR 首屏的新鮮期，需與 community/page.tsx 的 `revalidate = 30` 對齊 */
export const INITIAL_DATA_STALE_MS = 30_000;

export type FeedOrigin =
  | { kind: "none" }
  /** 伺服器渲染的匿名首屏 */
  | { kind: "ssr"; generatedAt: number }
  /** 瀏覽器端以某位觀看者（null＝匿名）的身分讀回來的 */
  | { kind: "viewer"; uid: string | null };

export interface FeedState {
  pages: SocialPost[][];
  origin: FeedOrigin;
  hasMore: boolean;
  /** 最近一次「換觀看者／重讀」失敗 */
  loadFailed: boolean;
}

export const emptyFeed: FeedState = {
  pages: [],
  origin: { kind: "none" },
  hasMore: true,
  loadFailed: false,
};

export function initialFeedState(
  initial: {
    posts: SocialPost[];
    hasMore: boolean;
    generatedAt: number;
  } | null,
): FeedState {
  if (!initial) return emptyFeed;
  return {
    pages: [initial.posts],
    origin: { kind: "ssr", generatedAt: initial.generatedAt },
    hasMore: initial.hasMore,
    loadFailed: false,
  };
}

export type FeedAction =
  /** 以某位觀看者的身分讀回第一頁，整份取代 */
  | {
      type: "replaced";
      uid: string | null;
      posts: SocialPost[];
      pageSize?: number;
    }
  /** 重讀失敗 */
  | { type: "replaceFailed" }
  /** 下一頁 */
  | { type: "pageAppended"; posts: SocialPost[]; pageSize?: number }
  | { type: "postAdded"; post: SocialPost }
  | { type: "postRemoved"; id: string }
  | { type: "authorRemoved"; authorId: string };

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "replaced":
      return {
        pages: [action.posts],
        origin: { kind: "viewer", uid: action.uid },
        hasMore: action.posts.length >= (action.pageSize ?? FEED_PAGE_SIZE),
        loadFailed: false,
      };
    case "replaceFailed":
      return { ...state, loadFailed: true };
    case "pageAppended":
      return {
        ...state,
        pages: [...state.pages, action.posts],
        hasMore: action.posts.length >= (action.pageSize ?? FEED_PAGE_SIZE),
      };
    case "postAdded": {
      if (state.pages.length === 0) {
        return { ...state, pages: [[action.post]] };
      }
      const [first, ...rest] = state.pages;
      return {
        ...state,
        pages: [
          [action.post, ...first.filter((item) => item.id !== action.post.id)],
          ...rest,
        ],
      };
    }
    case "postRemoved":
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.filter((post) => post.id !== action.id),
        ),
      };
    case "authorRemoved":
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.filter((post) => post.author.id !== action.authorId),
        ),
      };
  }
}

/** 畫面上該顯示的貼文：去重，並套用 fail-closed 與「換人即清空」 */
export function visiblePosts(
  state: FeedState,
  uid: string | null,
): SocialPost[] {
  const { origin } = state;
  // 前一位觀看者的內容不能留給現在這位
  if (origin.kind === "viewer" && origin.uid !== uid) return [];
  // 登入者的讀取失敗了、畫面上還是匿名首屏：那一頁不是他的動態牆
  if (uid && origin.kind === "ssr" && state.loadFailed) return [];
  const seen = new Map<string, SocialPost>();
  for (const page of state.pages) {
    for (const post of page) seen.set(post.id, post);
  }
  return Array.from(seen.values());
}

/** 目前這份資料是不是「匿名首屏被拿來當登入者的」 */
export function isAnonymousForViewer(
  state: FeedState,
  uid: string | null,
): boolean {
  return Boolean(uid) && state.origin.kind === "ssr";
}

/**
 * 觀看者解析（或改變）之後要不要重讀：
 * - 已經是這位觀看者讀回來的 → 不用
 * - 登入者 → 一定要讀（拿自己的反應狀態與封鎖過濾）
 * - 匿名者 → 沒有資料，或 SSR 首屏過了 ISR 週期才讀
 */
export function needsRefetch(
  state: FeedState,
  uid: string | null,
  now: number,
): boolean {
  const { origin } = state;
  if (origin.kind === "viewer") return origin.uid !== uid;
  if (uid) return true;
  if (origin.kind === "none") return true;
  return now - origin.generatedAt > INITIAL_DATA_STALE_MS;
}

/** 下一頁的游標來源：最後一頁最後一列 */
export function lastPost(state: FeedState): SocialPost | null {
  for (let i = state.pages.length - 1; i >= 0; i--) {
    const page = state.pages[i];
    if (page.length > 0) return page[page.length - 1];
  }
  return null;
}
