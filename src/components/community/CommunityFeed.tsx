"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import PostActionsMenu from "@/components/community/PostActionsMenu";
import PostCard from "@/components/community/PostCard";
import PostComposer from "@/components/community/PostComposer";
import PostSkeleton from "@/components/community/PostSkeleton";
import { useCommunityFeed } from "@/components/community/useCommunityFeed";
import { useRestoreScroll } from "@/components/community/useRestoreScroll";
import type { FeedPage } from "@/lib/community/reads";

// 動態牆：SSR 首屏（匿名視角）＋ 瀏覽器端依觀看者重讀與分頁。
// 滾到底自動載入下一頁，並保留「載入更多」按鈕當作後備（沒有 IntersectionObserver
// 或載入失敗需要重試時使用）。

const outlineButton =
  "cut-sm border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red";

export default function CommunityFeed({
  initialData,
}: {
  initialData: FeedPage | null;
}) {
  const t = useTranslations("communityBoard.feed");
  const feed = useCommunityFeed({ initialData });
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { hasMore, isLoadingMore, loadMore, error, posts } = feed;
  // 從貼文頁回來：列表內容備好之後捲回剛剛的位置
  useRestoreScroll(!feed.isLoading && posts.length > 0);

  const canAutoLoad = hasMore && !isLoadingMore && !error && posts.length > 0;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canAutoLoad || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAutoLoad, loadMore]);

  let content: React.ReactNode;
  if (feed.isLoading) {
    content = <PostSkeleton />;
  } else if (posts.length === 0) {
    content = error ? (
      <div className="cut border border-border-dim bg-bg-panel/40 p-6 text-center">
        <p className="font-body text-sm text-text-2">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => void feed.refresh()}
          className={`${outlineButton} mt-3`}
        >
          {t("clickToRetry")}
        </button>
      </div>
    ) : (
      <div className="cut border border-border-dim bg-bg-panel/40 p-8 text-center">
        <p className="font-display text-lg font-bold text-text-1">
          {t("noPosts")}
        </p>
        <p className="mt-2 font-body text-sm text-text-2">
          {t("beFirstToPost")}
        </p>
      </div>
    );
  } else {
    content = (
      <>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            menu={
              <PostActionsMenu
                kind="post"
                targetId={post.id}
                authorId={post.author.id}
                didReport={post.didReport}
                onRemoved={() => feed.removePost(post.id)}
                // 伺服器之後會過濾這位作者；認領前的舊作者沒有 id，只能整份重讀
                onBlocked={() =>
                  post.author.id
                    ? feed.removeByAuthor(post.author.id)
                    : void feed.refresh()
                }
              />
            }
          />
        ))}

        <div ref={sentinelRef} aria-hidden className="h-px" />

        {isLoadingMore && <PostSkeleton count={1} />}

        {error && (
          <p className="text-center font-body text-sm text-text-3">
            {t("loadMoreError")}
          </p>
        )}

        {hasMore && !isLoadingMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className={`${outlineButton} mx-auto`}
          >
            {error ? t("clickToRetry") : t("loadMore")}
          </button>
        )}

        {!hasMore && (
          <p className="text-center font-body text-sm text-text-3">
            {t("noMorePosts")}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PostComposer onPosted={feed.addPost} />
      {content}
    </div>
  );
}
