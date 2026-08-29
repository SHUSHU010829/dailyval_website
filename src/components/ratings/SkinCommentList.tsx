"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import SkinCommentRow from "@/components/ratings/SkinCommentRow";
import SkinCommentComposer from "@/components/ratings/SkinCommentComposer";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import {
  deleteSkinComment,
  fetchMyLikedCommentIDs,
  fetchSkinThread,
  reportSkinComment,
  setSkinCommentLike,
} from "@/lib/ratings/skin-service";
import type { SkinCommentData } from "@/lib/ratings/skin-comments";

// 造型留言（互動版）：最新／熱門切換、發佈、按讚、作者刪除、檢舉。
// 資料由 server component 抓好傳進來；寫入走 skins RPC（SET 語意的
// 按讚回傳權威讚數對）。封鎖名單沿用電競的帳號層封鎖，渲染時過濾。

type CommentSort = "newest" | "top";

interface SkinCommentListProps {
  skinID: string;
  comments: SkinCommentData[];
  locale: string;
}

export default function SkinCommentList({
  skinID,
  comments: initialComments,
  locale,
}: SkinCommentListProps) {
  const t = useTranslations("ratings.skins.comments");
  const session = useEsportsSession();
  // session 的 ref 鏡像：await 之後的所有權檢查必須讀「現在」的值——
  // 閉包裡的 session 是舊 render 的快照（esports CommentsSection 同款）
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const [sort, setSort] = useState<CommentSort>("newest");
  const [comments, setComments] = useState(initialComments);
  // 我的讚綁著它所屬的帳號；登出／換帳號時衍生值自動變空集合，
  // 慢回應的發佈帶著自己的 uid，對新帳號隱形（repo 慣用的衍生鍵）
  const [likedState, setLikedState] = useState<{
    user: string | null;
    ids: Set<string>;
  }>({ user: null, ids: new Set() });
  const likedIDs = likedState.user === session.uid ? likedState.ids : new Set<string>();
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  // 已檢舉集合同樣綁帳號：A 檢舉過的不能在 B 眼裡顯示成已檢舉
  const [reportedState, setReportedState] = useState<{
    user: string | null;
    ids: Set<string>;
  }>({ user: null, ids: new Set() });
  const reportedIDs =
    reportedState.user === session.uid ? reportedState.ids : new Set<string>();
  const [actionError, setActionError] = useState(false);

  const uid = session.uid;
  const signedIn = session.status === "signedIn";

  // 登入後抓「這批留言裡我按過讚的」個人化狀態
  const commentIDsKey = useMemo(
    () => comments.map((comment) => comment.id).join(","),
    [comments]
  );
  useEffect(() => {
    let cancelled = false;
    if (!signedIn || !uid || commentIDsKey.length === 0) {
      return () => {
        cancelled = true;
      };
    }
    fetchMyLikedCommentIDs(commentIDsKey.split(","))
      .then((ids) => {
        if (!cancelled) setLikedState({ user: uid, ids: new Set(ids) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn, uid, commentIDsKey]);

  // 封鎖的作者渲染時過濾（帳號層封鎖與電競共用；legacy 匯入沒有
  // live 作者，不受封鎖影響）
  const visible = useMemo(
    () =>
      comments.filter(
        (comment) => !comment.authorUID || !session.blockedIDs.has(comment.authorUID)
      ),
    [comments, session.blockedIDs]
  );

  const sorted = useMemo(() => {
    if (sort === "newest") {
      return [...visible].sort((a, b) => b.createdAt - a.createdAt);
    }
    // Top：讚數多在前，同讚數以新留言在前
    return [...visible].sort((a, b) =>
      a.likeCount !== b.likeCount
        ? b.likeCount - a.likeCount
        : b.createdAt - a.createdAt
    );
  }, [visible, sort]);

  async function refreshThread() {
    const fresh = await fetchSkinThread(skinID);
    if (fresh) setComments(fresh);
  }

  async function handleToggleLike(comment: SkinCommentData) {
    // expectedUID 在點擊當下捕捉；伺服器拒絕半路換帳號的寫入
    const actingUID = uid;
    if (!signedIn || !actingUID || likePending.has(comment.id)) return;
    setLikePending((previous) => new Set(previous).add(comment.id));
    setActionError(false);

    const wasLiked = likedIDs.has(comment.id);
    const applyLike = (liked: boolean, likeCount: number) => {
      setLikedState((previous) => {
        const base = previous.user === actingUID ? previous.ids : new Set<string>();
        const ids = new Set(base);
        if (liked) ids.add(comment.id);
        else ids.delete(comment.id);
        return { user: actingUID, ids };
      });
      setComments((previous) =>
        previous.map((entry) =>
          entry.id === comment.id ? { ...entry, likeCount } : entry
        )
      );
    };

    // 樂觀 toggle；RPC 回傳的權威 (liked, likeCount) 對收尾。完成回填
    // 只屬於發起的 session：帳號換人後，A 的慢完成不得把 likedState 的
    // 擁有者改回 A（那會清掉 B 已載入的愛心）——伺服器端由 expectedUID
    // 擋、發布端由這個活引用檢查擋。
    applyLike(!wasLiked, Math.max(0, comment.likeCount + (wasLiked ? -1 : 1)));
    try {
      const result = await setSkinCommentLike({
        commentID: comment.id,
        liked: !wasLiked,
        expectedUID: actingUID,
      });
      if (sessionRef.current.uid === actingUID) {
        applyLike(result.liked, result.likeCount);
      }
    } catch {
      if (sessionRef.current.uid === actingUID) {
        applyLike(wasLiked, comment.likeCount);
        setActionError(true);
      }
    }
    setLikePending((previous) => {
      const next = new Set(previous);
      next.delete(comment.id);
      return next;
    });
  }

  async function handleDelete(comment: SkinCommentData) {
    const actingUID = uid;
    if (!actingUID || comment.authorUID !== actingUID) return;
    setActionError(false);
    const previous = comments;
    setComments((current) => current.filter((entry) => entry.id !== comment.id));
    try {
      await deleteSkinComment({ commentID: comment.id, expectedUID: actingUID });
    } catch {
      // 伺服器拒絕（包含帳號半路換人的 uid_mismatch）＝什麼都沒刪，
      // 還原本地移除；錯誤提示只屬於發起的 session
      setComments(previous);
      if (sessionRef.current.uid === actingUID) setActionError(true);
    }
  }

  async function handleReport(comment: SkinCommentData) {
    const actingUID = uid;
    if (!signedIn || !actingUID || reportedIDs.has(comment.id)) return;
    setActionError(false);
    try {
      await reportSkinComment({ commentID: comment.id, expectedUID: actingUID });
      if (sessionRef.current.uid !== actingUID) return;
      setReportedState((previous) => {
        const base = previous.user === actingUID ? previous.ids : new Set<string>();
        const ids = new Set(base);
        ids.add(comment.id);
        return { user: actingUID, ids };
      });
    } catch {
      if (sessionRef.current.uid === actingUID) setActionError(true);
    }
  }

  const toggleClass = (active: boolean) =>
    [
      "cut-sm px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      active
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  return (
    <section aria-label={t("title")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-1">
          {t("title")}
          <span className="ml-2 font-ui text-sm font-bold text-text-3">
            {visible.length}
          </span>
        </h2>
        {visible.length > 1 && (
          <div className="flex gap-2" role="group" aria-label={t("sortLabel")}>
            <button
              type="button"
              onClick={() => setSort("newest")}
              aria-pressed={sort === "newest"}
              className={toggleClass(sort === "newest")}
            >
              {t("sortNewest")}
            </button>
            <button
              type="button"
              onClick={() => setSort("top")}
              aria-pressed={sort === "top"}
              className={toggleClass(sort === "top")}
            >
              {t("sortTop")}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <SkinCommentComposer skinID={skinID} onPosted={() => void refreshThread()} />
      </div>

      {actionError && (
        <p role="alert" className="mt-3 font-ui text-xs text-val-red">
          {t("actionFailed")}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="mt-6 py-10 text-center font-ui text-sm text-text-2">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border-dim border-y border-border-dim">
          {sorted.map((comment) => {
            const isOwn = uid !== null && comment.authorUID === uid;
            return (
              <SkinCommentRow
                key={comment.id}
                comment={comment}
                locale={locale}
                likedByMe={likedIDs.has(comment.id)}
                canLike={signedIn}
                isOwn={isOwn}
                canReport={signedIn && !isOwn}
                reported={reportedIDs.has(comment.id)}
                onToggleLike={() => void handleToggleLike(comment)}
                onDelete={() => void handleDelete(comment)}
                onReport={() => void handleReport(comment)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
