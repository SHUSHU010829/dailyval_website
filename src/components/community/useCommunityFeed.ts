"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import {
  feedReducer,
  initialFeedState,
  isAnonymousForViewer,
  lastPost,
  needsRefetch,
  visiblePosts,
  type FeedState,
} from "@/lib/community/feed-state";
import { cursorOf } from "@/lib/community/mapping";
import type { FeedPage } from "@/lib/community/reads";
import { authorPosts, feedPage } from "@/lib/community/service";
import type { SocialPost } from "@/lib/community/types";

// 動態牆／個人頁的分頁。規則都在 feed-state.ts（純函式、有測試），這裡只負責
// 把它接到 React：什麼時候讀、讀回來丟給 reducer、以及返回時保留已載入的頁面。
//
// 什麼時候重讀由下面第一個 effect 決定：session 還在載入時不動；解析出觀看者
// 之後，登入者一定要讀（拿自己的反應狀態與封鎖過濾），匿名者只在沒有首屏或
// 首屏過了 ISR 週期時讀。

/** 從貼文頁返回時保留已載入的頁面；只在瀏覽器端寫入，伺服器端永遠是空的 */
const pageCache = new Map<string, { state: FeedState; savedAt: number }>();
const CACHE_TTL_MS = 5 * 60_000;

interface UseCommunityFeedOptions {
  /** SSR 首屏（匿名視角） */
  initialData?: FeedPage | null;
  /** 有值時讀某位作者的歷史而不是整個動態牆 */
  authorId?: string | null;
}

function restore(key: string): FeedState | null {
  const hit = pageCache.get(key);
  if (!hit || Date.now() - hit.savedAt > CACHE_TTL_MS) return null;
  return hit.state;
}

export function useCommunityFeed({
  initialData = null,
  authorId = null,
}: UseCommunityFeedOptions = {}) {
  const { status, uid } = useCommunitySession();
  const cacheKey = authorId ?? "feed";
  const [state, dispatch] = useReducer(
    feedReducer,
    undefined,
    () => restore(cacheKey) ?? initialFeedState(initialData),
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  // 非同步回來時要確認「這份答案還屬於畫面上這一份資料」：換觀看者、重讀都會
  // 讓編號前進，舊答案直接丟掉
  const epochRef = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    pageCache.set(cacheKey, { state, savedAt: Date.now() });
  }, [state, cacheKey]);

  const loadFirstPage = useCallback(
    async (forUid: string | null) => {
      const epoch = ++epochRef.current;
      try {
        const posts = await (authorId
          ? authorPosts(authorId, null)
          : feedPage(null));
        if (epochRef.current !== epoch) return;
        dispatch({ type: "replaced", uid: forUid, posts });
      } catch {
        if (epochRef.current !== epoch) return;
        dispatch({ type: "replaceFailed" });
      }
    },
    [authorId],
  );

  useEffect(() => {
    if (status === "loading") return;
    if (needsRefetch(stateRef.current, uid, Date.now())) {
      void loadFirstPage(uid);
    }
    // 觀看者換了或離開：還在路上的答案不屬於下一位
    return () => {
      epochRef.current += 1;
    };
  }, [status, uid, loadFirstPage]);

  const posts = useMemo(() => visiblePosts(state, uid), [state, uid]);

  const loadMore = useCallback(async () => {
    const cursorPost = lastPost(state);
    if (isLoadingMore || !state.hasMore || !cursorPost || posts.length === 0) {
      return;
    }
    const epoch = epochRef.current;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const cursor = cursorOf(cursorPost);
      const next = await (authorId
        ? authorPosts(authorId, cursor)
        : feedPage(cursor));
      if (epochRef.current === epoch) {
        dispatch({ type: "pageAppended", posts: next });
      }
    } catch {
      if (epochRef.current === epoch) setLoadMoreFailed(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [authorId, isLoadingMore, posts.length, state]);

  const refresh = useCallback(() => loadFirstPage(uid), [loadFirstPage, uid]);

  /**
   * 匿名首屏不能被複製成登入者的快取（會把他封鎖的作者一起複製進去）：
   * 這種時候改成重讀一次，而不是在上面直接改。
   */
  const addPost = useCallback(
    (post: SocialPost) => {
      if (isAnonymousForViewer(stateRef.current, uid)) {
        void loadFirstPage(uid);
        return;
      }
      dispatch({ type: "postAdded", post });
    },
    [loadFirstPage, uid],
  );

  const removePost = useCallback(
    (id: string) => {
      if (isAnonymousForViewer(stateRef.current, uid)) {
        void loadFirstPage(uid);
        return;
      }
      dispatch({ type: "postRemoved", id });
    },
    [loadFirstPage, uid],
  );

  /** 封鎖了某位作者：動態牆上他的貼文一起收掉 */
  const removeByAuthor = useCallback((authorIdToRemove: string) => {
    dispatch({ type: "authorRemoved", authorId: authorIdToRemove });
  }, []);

  return {
    posts,
    error: state.loadFailed || loadMoreFailed,
    isLoading: state.origin.kind === "none" && !state.loadFailed,
    isLoadingMore,
    hasMore: state.hasMore,
    loadMore,
    refresh,
    addPost,
    removePost,
    removeByAuthor,
  };
}
