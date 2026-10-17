"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import CommentComposer from "@/components/community/CommentComposer";
import CommentRow from "@/components/community/CommentRow";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import { COMMENTS_PAGE_SIZE } from "@/lib/community/constants";
import { commentsPage } from "@/lib/community/service";
import {
  addLocal,
  appendPage,
  emptyThread,
  nextCursor,
  removeByAuthor,
  removeComment,
  visibleComments,
  type ThreadState,
} from "@/lib/community/thread";
import type { SocialComment } from "@/lib/community/types";

// 貼文的討論串：輸入框、留言列表與往後翻頁。
// 觀看者換了（登入／登出）就整串重讀——反應狀態與封鎖過濾都依觀看者而定。

type ThreadStatus = "loading" | "ready" | "error";

interface CommentThreadProps {
  postId: string;
  /** 留言數的增減（新增 +1、刪除 -1），讓上面的貼文卡同步 */
  onCountChange(delta: number): void;
}

const outlineButton =
  "cut-sm border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red disabled:opacity-50";

export default function CommentThread({
  postId,
  onCountChange,
}: CommentThreadProps) {
  const t = useTranslations("communityBoard.post");
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const { status, generation } = useCommunitySession();
  const [thread, setThread] = useState<ThreadState>(emptyThread);
  const [threadStatus, setThreadStatus] = useState<ThreadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  // 換世代（登入／登出／換帳號）：舊觀看者的討論串整份丟掉。直接在 render 階段
  // 調整 state（React 建議的「依 props 重設」寫法），不必在 effect 裡同步清空
  const [syncedGeneration, setSyncedGeneration] = useState(generation);
  if (syncedGeneration !== generation) {
    setSyncedGeneration(generation);
    setThread(emptyThread);
    setThreadStatus("loading");
  }

  // 觀看者世代的鏡像：非同步工作回來時對一下，舊觀看者的結果不進新觀看者的畫面
  const generationRef = useRef(generation);
  useEffect(() => {
    generationRef.current = generation;
  }, [generation]);

  /**
   * 第一頁留言。失敗留在 error 狀態給人重試。這個觀看者剛送出、還沒從伺服器
   * 讀回來的留言要保留：第一頁可能是在他送出之前就開始讀的，不會帶著那一則。
   */
  const loadFirstPage = useCallback(
    async (forGeneration: number) => {
      try {
        const firstPage = await commentsPage(postId, null);
        if (generationRef.current !== forGeneration) return;
        setThread((current) =>
          appendPage(
            { pages: [], local: current.local, hasMore: false },
            firstPage,
            COMMENTS_PAGE_SIZE,
          ),
        );
        setThreadStatus("ready");
      } catch {
        if (generationRef.current !== forGeneration) return;
        setThreadStatus("error");
      }
    },
    [postId],
  );

  useEffect(() => {
    if (status === "loading") return;
    void loadFirstPage(generation);
  }, [status, generation, loadFirstPage]);

  const loadMore = async () => {
    if (loadingMore || !thread.hasMore) return;
    const forGeneration = generationRef.current;
    setLoadingMore(true);
    try {
      const page = await commentsPage(postId, nextCursor(thread));
      if (generationRef.current !== forGeneration) return;
      setThread((current) => appendPage(current, page, COMMENTS_PAGE_SIZE));
    } catch (error) {
      if (generationRef.current !== forGeneration) return;
      notify("error", describe(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRemoved = (id: string) => {
    setThread((current) => removeComment(current, id));
    onCountChange(-1);
  };

  const handleBlocked = (comment: SocialComment) => {
    // 伺服器反解作者；被封鎖者在這串裡的其他留言也一起收掉
    setThread((current) =>
      comment.author.id
        ? removeByAuthor(current, comment.author.id)
        : removeComment(current, comment.id),
    );
  };

  const comments = visibleComments(thread);

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-8">
      <h2
        id="comments-heading"
        className="font-display text-lg font-black uppercase tracking-tight text-text-1"
      >
        {t("comments")}
      </h2>

      <div className="mt-4">
        <CommentComposer
          postId={postId}
          onCommentAdded={(comment) => {
            setThread((current) => addLocal(current, comment));
            onCountChange(1);
          }}
        />
      </div>

      {comments.length > 0 && (
        <div className="mt-4 divide-y divide-border-dim">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              onRemoved={handleRemoved}
              onBlocked={handleBlocked}
            />
          ))}
        </div>
      )}

      {threadStatus === "error" ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="font-body text-sm text-text-3">
            {t("commentsLoadFailed")}
          </p>
          <button
            type="button"
            onClick={() => {
              setThreadStatus("loading");
              void loadFirstPage(generationRef.current);
            }}
            className={outlineButton}
          >
            {t("retry")}
          </button>
        </div>
      ) : threadStatus === "loading" ? (
        comments.length === 0 && (
          <p className="py-12 text-center font-body text-sm text-text-3">
            {t("loadingComments")}
          </p>
        )
      ) : comments.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-text-3">
          {t("beFirstToComment")}
        </p>
      ) : (
        thread.hasMore && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className={outlineButton}
            >
              {loadingMore ? t("loadingComments") : t("loadMoreComments")}
            </button>
          </div>
        )
      )}
    </section>
  );
}
