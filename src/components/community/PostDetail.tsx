"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import CommentThread from "@/components/community/CommentThread";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import PostActionsMenu from "@/components/community/PostActionsMenu";
import PostCard from "@/components/community/PostCard";
import PostSkeleton from "@/components/community/PostSkeleton";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import { useRestoreScroll } from "@/components/community/useRestoreScroll";
import Icon from "@/components/Icon";
import { Link, useRouter } from "@/i18n/navigation";
import { postDetail } from "@/lib/community/service";
import type { SocialPost } from "@/lib/community/types";

// 貼文詳情頁。首屏是伺服器渲染的匿名視角（爬蟲看得到內文）；觀看者解析之後：
// - 匿名者留著 SSR 那一份（那本來就是匿名視角）
// - 登入者先清空，再讀自己視角的貼文——匿名那一份可能是他封鎖的作者，讀取失敗時
//   給重試，不給上一個視角的東西（fail-closed）

interface PostDetailProps {
  postId: string;
  initialPost: SocialPost | null;
}

const outlineButton =
  "cut-sm border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red";

export default function PostDetail({ postId, initialPost }: PostDetailProps) {
  const t = useTranslations("communityBoard.post");
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const router = useRouter();
  const { status, uid, generation } = useCommunitySession();

  const [post, setPost] = useState<SocialPost | null>(initialPost);
  const [loading, setLoading] = useState(initialPost === null);
  const [postFailed, setPostFailed] = useState(false);
  const [commentCount, setCommentCount] = useState(
    initialPost?.commentCount ?? 0,
  );

  // 換世代（登入／登出／換帳號）：依新觀看者重設畫面。直接在 render 階段調整
  // state（React 建議的「依 props 重設」寫法）
  const [syncedGeneration, setSyncedGeneration] = useState(generation);
  if (syncedGeneration !== generation) {
    setSyncedGeneration(generation);
    setPostFailed(false);
    if (uid) {
      setPost(null);
      setLoading(true);
    } else {
      setPost(initialPost);
      setCommentCount(initialPost?.commentCount ?? 0);
      setLoading(initialPost === null);
    }
  }

  // 觀看者世代的鏡像：非同步工作回來時對一下，舊觀看者的結果不進新觀看者的畫面
  const generationRef = useRef(generation);
  useEffect(() => {
    generationRef.current = generation;
  }, [generation]);

  const loadPost = useCallback(
    async (forGeneration: number, failClosed: boolean) => {
      try {
        const fresh = await postDetail(postId);
        if (generationRef.current !== forGeneration) return;
        setPost(fresh);
        if (fresh) setCommentCount(fresh.commentCount);
        setPostFailed(false);
      } catch (error) {
        if (generationRef.current !== forGeneration) return;
        if (failClosed) {
          setPost(null);
          setPostFailed(true);
        } else if (!initialPost) {
          setPostFailed(true);
        } else {
          notify("error", describe(error));
        }
      } finally {
        if (generationRef.current === forGeneration) setLoading(false);
      }
    },
    [postId, initialPost, notify, describe],
  );

  // 從作者頁回來：貼文備好之後捲回剛剛的位置
  useRestoreScroll(!loading && post !== null);

  useEffect(() => {
    if (status === "loading") return;
    void loadPost(generation, Boolean(uid));
  }, [status, generation, uid, loadPost]);

  const backLink = (
    <Link
      href="/community"
      className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-text-2 transition-colors hover:text-text-1"
    >
      <Icon name="ArrowLeft" size={14} aria-hidden />
      {t("back")}
    </Link>
  );

  if (loading) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <PostSkeleton count={1} />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div>
        {backLink}
        <div className="flex flex-col items-center gap-3 pb-24 pt-8">
          <p className="font-body text-sm font-bold text-text-3">
            {postFailed ? t("loadFailed") : t("notFound")}
          </p>
          {postFailed && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadPost(generationRef.current, Boolean(uid));
              }}
              className={outlineButton}
            >
              {t("retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {backLink}
      <div className="mt-4">
        <PostCard
          post={post}
          detail
          commentCount={commentCount}
          menu={
            <PostActionsMenu
              kind="post"
              targetId={post.id}
              authorId={post.author.id}
              didReport={post.didReport}
              // 這篇不該再顯示了，回動態牆
              onRemoved={() => router.push("/community")}
              onBlocked={() => router.push("/community")}
            />
          }
        />
      </div>
      <CommentThread
        postId={postId}
        onCountChange={(delta) =>
          setCommentCount((count) => Math.max(0, count + delta))
        }
      />
    </div>
  );
}
