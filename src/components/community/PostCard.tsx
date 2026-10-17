"use client";

import { memo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import AuthorBadge from "@/components/community/AuthorBadge";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import PostImages from "@/components/community/PostImages";
import TextWithTags from "@/components/community/TextWithTags";
import { useReaction } from "@/components/community/useReaction";
import { useRequireSignIn } from "@/components/community/useRequireSignIn";
import Icon from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import { setPostReaction } from "@/lib/community/service";
import { formatRelativeTime } from "@/lib/community/time";
import { saveScroll } from "@/lib/community/scroll-memory";
import { postURL, sharePost } from "@/lib/community/share";
import type { ReactionKind, SocialPost } from "@/lib/community/types";

interface PostCardProps {
  post: SocialPost;
  /** 右上角的動作選單（檢舉／封鎖／刪除）；由動態牆或詳情頁決定行為後傳入 */
  menu?: React.ReactNode;
  /** 詳情頁：內文不再連回自己，留言鈕改成跳到留言區 */
  detail?: boolean;
  /** 詳情頁會即時增減留言數，以它為準 */
  commentCount?: number;
}

const actionClass =
  "flex items-center gap-1.5 px-2 py-1 font-ui text-sm tabular-nums text-text-2 transition-colors";

const PostCard = memo(function PostCard({
  post,
  menu,
  detail = false,
  commentCount = post.commentCount,
}: PostCardProps) {
  const t = useTranslations("communityBoard.post");
  const locale = useLocale();
  const { uid } = useCommunitySession();
  const { notify } = useCommunityNotice();
  const requireSignIn = useRequireSignIn();

  // 樂觀反應狀態：畫面先改，佇列把最後的意圖送到伺服器，伺服器的計數回來覆蓋
  const { state: reaction, react: sendReaction } = useReaction({
    row: post,
    server: {
      mine: post.myReaction,
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
    },
    uid,
    send: (kind, forUid) =>
      setPostReaction(post.id, kind, forUid).then((result) => ({
        mine: result.mine,
        likeCount: result.likeCount,
        dislikeCount: result.dislikeCount,
      })),
  });

  const react = (kind: ReactionKind) => {
    if (!requireSignIn()) return;
    sendReaction(kind);
  };

  const share = useCallback(async () => {
    const result = await sharePost({
      title: t("shareTitle", { name: post.author.name }),
      text: post.body
        ? post.body.slice(0, 100) + (post.body.length > 100 ? "..." : "")
        : t("shareText"),
      url: postURL(locale, post.id),
    });
    if (result === "copied") notify("success", t("linkCopied"));
    if (result === "failed") notify("error", t("copyFailed"));
  }, [locale, notify, post, t]);

  const postHref = `/community/post/${post.id}`;

  // 點進貼文前記下目前位置，回到列表時還原
  const rememberScroll = () =>
    saveScroll({
      path: window.location.pathname,
      y: window.scrollY,
      postId: post.id,
    });

  return (
    <article
      id={`post-${post.id}`}
      className="cut border border-border-dim bg-bg-panel/40 p-4 transition-colors hover:border-border-med"
    >
      <header className="flex items-start justify-between gap-2">
        <AuthorBadge author={post.author} />
        {menu}
      </header>

      {post.body &&
        (detail ? (
          <p className="mt-3 whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text-1 md:text-base">
            <TextWithTags text={post.body} />
          </p>
        ) : (
          <Link href={postHref} onClick={rememberScroll} className="mt-3 block">
            <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text-1 md:text-base">
              <TextWithTags text={post.body} />
            </p>
          </Link>
        ))}

      {post.images.length > 0 && (
        <div className="mt-3">
          <PostImages images={post.images} />
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between gap-2">
        <div className="-ml-2 flex items-center">
          <button
            type="button"
            onClick={() => react("like")}
            aria-pressed={reaction.mine === "like"}
            aria-label={t("like")}
            className={`${actionClass} hover:text-val-red ${reaction.mine === "like" ? "text-val-red" : ""}`}
          >
            <Icon
              name="ThumbsUp"
              size={20}
              weight={reaction.mine === "like" ? "fill" : "bold"}
            />
            {reaction.likeCount}
          </button>
          <button
            type="button"
            onClick={() => react("dislike")}
            aria-pressed={reaction.mine === "dislike"}
            aria-label={t("dislike")}
            className={`${actionClass} hover:text-jett-blue ${reaction.mine === "dislike" ? "text-jett-blue" : ""}`}
          >
            <Icon
              name="ThumbsDown"
              size={20}
              weight={reaction.mine === "dislike" ? "fill" : "bold"}
            />
            {reaction.dislikeCount}
          </button>
          {detail ? (
            <a
              href="#comments"
              aria-label={t("comments")}
              className={`${actionClass} hover:text-viper-green`}
            >
              <Icon name="ChatCircle" size={20} />
              {commentCount}
            </a>
          ) : (
            <Link
              href={postHref}
              onClick={rememberScroll}
              aria-label={t("comments")}
              className={`${actionClass} hover:text-viper-green`}
            >
              <Icon name="ChatCircle" size={20} />
              {commentCount}
            </Link>
          )}
          <button
            type="button"
            onClick={() => void share()}
            aria-label={t("share")}
            className={`${actionClass} hover:text-gold`}
          >
            <Icon name="ShareNetwork" size={20} />
          </button>
        </div>
        {/* 相對時間隨時鐘與時區變動，伺服器與瀏覽器算出來的字可以不同 */}
        <time
          dateTime={post.createdAt}
          suppressHydrationWarning
          className="shrink-0 font-ui text-xs text-text-3"
        >
          {formatRelativeTime(post.createdAt, locale)}
        </time>
      </footer>
    </article>
  );
});

export default PostCard;
