"use client";

import { useTranslations } from "next-intl";
import AuthorBadge from "@/components/community/AuthorBadge";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import PostActionsMenu from "@/components/community/PostActionsMenu";
import PostCard from "@/components/community/PostCard";
import PostSkeleton from "@/components/community/PostSkeleton";
import { useCommunityFeed } from "@/components/community/useCommunityFeed";
import { useRestoreScroll } from "@/components/community/useRestoreScroll";
import Icon from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import type { AuthorProfile } from "@/lib/community/types";

// 作者頁：表頭（伺服器渲染的 profile）加上這位作者的歷史貼文。
// profile 為 null 代表認領前的舊作者或不存在的 id，沒有可定址的個人頁。

interface AuthorPageProps {
  authorId: string;
  profile: AuthorProfile | null;
}

const outlineButton =
  "cut-sm border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red";

export default function AuthorPage({ authorId, profile }: AuthorPageProps) {
  const t = useTranslations("communityBoard.author");
  const tFeed = useTranslations("communityBoard.feed");
  const { status, uid } = useCommunitySession();
  const feed = useCommunityFeed({ authorId });
  useRestoreScroll(!feed.isLoading && feed.posts.length > 0);
  const isSelf = status === "signedIn" && uid === authorId;

  const backLink = (
    <Link
      href="/community"
      className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-text-2 transition-colors hover:text-text-1"
    >
      <Icon name="ArrowLeft" size={14} aria-hidden />
      {t("backToBoard")}
    </Link>
  );

  if (!profile) {
    return (
      <div>
        {backLink}
        <p className="py-12 text-center font-body text-sm text-text-3">
          {t("profileUnavailable")}
        </p>
      </div>
    );
  }

  let content: React.ReactNode;
  if (feed.isLoading) {
    content = <PostSkeleton count={3} />;
  } else if (feed.posts.length === 0) {
    content = (
      <div className="py-12 text-center">
        <p className="font-body text-sm text-text-3">
          {feed.error
            ? t("loadError")
            : isSelf
              ? t("noPostsSelf")
              : t("noPosts")}
        </p>
        {feed.error && (
          <button
            type="button"
            onClick={() => void feed.refresh()}
            className={`${outlineButton} mt-3`}
          >
            {tFeed("clickToRetry")}
          </button>
        )}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-3">
        {feed.posts.map((post) => (
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
                // 封鎖的就是這位作者：他的貼文整頁收掉
                onBlocked={() => feed.removeByAuthor(authorId)}
              />
            }
          />
        ))}
        {feed.hasMore && (
          <button
            type="button"
            onClick={() => void feed.loadMore()}
            disabled={feed.isLoadingMore}
            className={`${outlineButton} mx-auto disabled:opacity-50`}
          >
            {feed.error ? tFeed("clickToRetry") : tFeed("loadMore")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {backLink}
      <header className="mt-4 mb-6">
        <h1 className="sr-only">{profile.displayName}</h1>
        <AuthorBadge
          linked={false}
          size={56}
          author={{
            id: profile.id,
            name: profile.displayName ?? "",
            tagLine: profile.tagLine,
            rankTier: profile.rankTier,
            isVerified: profile.isVerified,
            isPremium: profile.isPremium,
            avatarURL: profile.avatarURL,
          }}
        />
      </header>
      {content}
    </div>
  );
}
