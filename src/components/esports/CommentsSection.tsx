"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import HudModal from "@/components/esports/HudModal";
import HudSelect from "@/components/creators/HudSelect";
import EsportsCommentRow, {
  type CommentViewModel,
} from "@/components/esports/EsportsCommentRow";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { useWindowCountdown } from "@/components/esports/hooks/useWindowCountdown";
import {
  fetchCommentsByIds,
  fetchHeatPage,
  fetchLikeCounts,
  fetchReplies,
  fetchTopLevelComments,
} from "@/lib/esports/comment-reads";
import {
  deleteComment,
  blockUser,
  myLikedCommentIDs,
  postComment,
  reportComment,
  setCommentLike,
  EsportsServiceError,
} from "@/lib/esports/rating-service";
import {
  accountReset,
  EMPTY_LIKE_STATE,
  mergeBatch,
  removeComment as likeRemove,
  sendFailure,
  sendSuccess,
  snapshotRevisions,
  tap,
  type LikeChainState,
} from "@/lib/esports/like-chain";
import { COMMENTS_PAGE_SIZE, HOT_MIN_LIKES } from "@/lib/esports/constants";
import type { CommentRow, HeatCursor, NewestCursor } from "@/lib/esports/types";

// 賽後留言（完整互動版）：
// - 最熱／最新排序、keyset 分頁、一層回覆（PR 2 的讀取骨架）
// - 發佈／回覆／刪除／檢舉／封鎖；讚走 like-chain 狀態機（400ms
//   debounce、每留言送出鏈、rollback 基準＝confirmed-else-pre-chain）
// - 封鎖作者的留言在 render 時過濾；整頁被濾空時 load-more 仍可用
// - 讚與發佈都是 window-gated；檢舉不受窗限制
// - 帳號世代柵欄：uid 變了，任何在途回應不得發佈；pending 讚回滾

interface CommentsSectionProps {
  riotMatchID: string;
  playerNames: Record<string, string>;
  commentCount: number;
  /** 評分窗（發佈與按讚的 gate）；無摘要＝不可互動 */
  windowOpen: boolean;
  windowClosesAtRaw: string | null;
}

type CommentSort = "hot" | "newest";

interface ThreadState {
  rows: CommentRow[];
  repliesByParent: Record<string, CommentRow[]>;
  newestCursor: NewestCursor | null;
  heatCursor: HeatCursor | null;
  hasMore: boolean;
}

const EMPTY_THREAD: ThreadState = {
  rows: [],
  repliesByParent: {},
  newestCursor: null,
  heatCursor: null,
  hasMore: false,
};

const LIKE_DEBOUNCE_MS = 400;
/** 伺服器端 3 秒留言冷卻；成功後就地停用送出鈕同樣長 */
const COMMENT_COOLDOWN_MS = 3000;
const BODY_LIMIT = 500;

type PendingAction =
  | { type: "delete" | "report" | "block"; row: CommentRow }
  | { type: "reported" }
  | null;

export default function CommentsSection({
  riotMatchID,
  playerNames,
  commentCount,
  windowOpen,
  windowClosesAtRaw,
}: CommentsSectionProps) {
  const t = useTranslations("esports.comments");
  const tError = useTranslations("esports.errors");
  const locale = useLocale();
  const session = useEsportsSession();
  const countdown = useWindowCountdown(windowOpen, windowClosesAtRaw);
  const interactionsEnabled = countdown.effectiveOpen;

  // ---------- 討論串（排序綁 key，切換即歸零） ----------
  const [sort, setSort] = useState<CommentSort>("hot");
  const [threadState, setThreadState] = useState<{ sort: CommentSort; data: ThreadState }>({
    sort: "hot",
    data: EMPTY_THREAD,
  });
  const thread = threadState.sort === sort ? threadState.data : EMPTY_THREAD;
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [count, setCount] = useState(commentCount);
  const generation = useRef(0);

  // ---------- 讚（like-chain 狀態機 + timers/送出鏈） ----------
  const [likeState, setLikeState] = useState<LikeChainState>(EMPTY_LIKE_STATE);
  // 非同步送出要讀「當下」的意向；ref 鏡像在 commit 後更新（送出至少
  // 在 400ms debounce 之後才讀，不會讀到舊值）
  const likeStateRef = useRef(likeState);
  useEffect(() => {
    likeStateRef.current = likeState;
  }, [likeState]);
  const likeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const likeChains = useRef<Record<string, Promise<void>>>({});

  // ---------- 留言合併讀（讚數 + 我的讚；pending/revised 的 id 不覆寫） ----------
  const mergeLikesFor = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const snapshot = snapshotRevisions(likeStateRef.current, ids);
      const sessionGeneration = session.generation;
      const [counts, mine] = await Promise.all([
        fetchLikeCounts(ids).catch(() => null),
        session.uid ? myLikedCommentIDs(ids).catch(() => null) : Promise.resolve(null),
      ]);
      if (sessionGeneration !== session.generation) return;
      const countsRecord = counts
        ? Object.fromEntries(counts.map((row) => [row.comment_id, row.like_count]))
        : null;
      setLikeState((state) =>
        mergeBatch(state, ids, countsRecord, mine ? new Set(mine) : null, snapshot)
      );
    },
    [session.uid, session.generation]
  );

  // 帳號世代轉換：pending 讚回滾、我的讚清空、重讀在畫面上的 id
  const lastGeneration = useRef(session.generation);
  useEffect(() => {
    if (lastGeneration.current === session.generation) return;
    lastGeneration.current = session.generation;
    for (const timer of Object.values(likeTimers.current)) clearTimeout(timer);
    likeTimers.current = {};
    likeChains.current = {};
    setLikeState((state) => accountReset(state));
    const held = [
      ...thread.rows.map((row) => row.id),
      ...Object.values(thread.repliesByParent).flat().map((row) => row.id),
    ];
    void mergeLikesFor(held);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在世代變化時跑
  }, [session.generation]);

  // ---------- 分頁載入 ----------
  const loadPage = useCallback(
    async (targetSort: CommentSort, current: ThreadState) => {
      const myGeneration = ++generation.current;
      await Promise.resolve();
      if (generation.current !== myGeneration) return;
      setStatus("loading");
      try {
        let pageRows: CommentRow[];
        let nextNewest: NewestCursor | null = current.newestCursor;
        let nextHeat: HeatCursor | null = current.heatCursor;
        let hasMore: boolean;

        if (targetSort === "newest") {
          pageRows = await fetchTopLevelComments({
            riotMatchID,
            cursor: current.newestCursor,
          });
          hasMore = pageRows.length === COMMENTS_PAGE_SIZE;
          const last = pageRows[pageRows.length - 1];
          if (last) nextNewest = { createdAtRaw: last.created_at, id: last.id };
        } else {
          const heatRows = await fetchHeatPage({
            riotMatchID,
            cursor: current.heatCursor,
          });
          hasMore = heatRows.length === COMMENTS_PAGE_SIZE;
          const last = heatRows[heatRows.length - 1];
          if (last) {
            nextHeat = {
              likeCount: last.like_count,
              createdAtRaw: last.created_at,
              id: last.comment_id,
            };
          }
          const bodies = await fetchCommentsByIds(heatRows.map((row) => row.comment_id));
          const byID = new Map(bodies.map((row) => [row.id, row]));
          pageRows = heatRows
            .map((row) => byID.get(row.comment_id))
            .filter((row): row is CommentRow => Boolean(row));
        }

        // 以 id 去重（熱門排序的 mutable key 會讓邊界重複）
        const held = new Set(current.rows.map((row) => row.id));
        const fresh = pageRows.filter((row) => !held.has(row.id));
        const replies = await fetchReplies(fresh.map((row) => row.id));

        if (generation.current !== myGeneration) return;

        setThreadState((previous) => {
          const base = previous.sort === targetSort ? previous.data : EMPTY_THREAD;
          const repliesByParent = { ...base.repliesByParent };
          for (const reply of replies) {
            if (!reply.parent_id) continue;
            repliesByParent[reply.parent_id] = [
              ...(repliesByParent[reply.parent_id] ?? []),
              reply,
            ];
          }
          return {
            sort: targetSort,
            data: {
              rows: [...base.rows, ...fresh],
              repliesByParent,
              newestCursor: nextNewest,
              heatCursor: nextHeat,
              hasMore,
            },
          };
        });
        setStatus("idle");
        // 讚（全域數＋我的）補齊；失敗不影響本文
        void mergeLikesFor([...fresh.map((row) => row.id), ...replies.map((row) => row.id)]);
      } catch {
        if (generation.current === myGeneration) setStatus("error");
      }
    },
    [riotMatchID, mergeLikesFor]
  );

  useEffect(() => {
    // 排序或比賽變更時整串重載（內容歸零由衍生值處理）。
    void loadPage(sort, EMPTY_THREAD);
  }, [sort, loadPage]);

  // ---------- 讚：點按 → debounce → 送最終狀態 ----------
  function toggleLike(commentID: string) {
    if (!interactionsEnabled) return;
    if (session.status !== "signedIn" || !session.uid) {
      void session.signInWithApple().catch(() => {});
      return;
    }
    const uid = session.uid;
    const sessionGeneration = session.generation;
    setLikeState((state) => tap(state, commentID));

    if (likeTimers.current[commentID]) clearTimeout(likeTimers.current[commentID]);
    likeTimers.current[commentID] = setTimeout(() => {
      delete likeTimers.current[commentID];
      // 送出鏈：同一留言的送出嚴格排隊，不與前一發競速
      const previous = likeChains.current[commentID] ?? Promise.resolve();
      likeChains.current[commentID] = previous.then(async () => {
        if (sessionGeneration !== session.generation) return;
        const desired = likeStateRef.current.mine[commentID] ?? false;
        try {
          const result = await setCommentLike(commentID, desired, uid);
          if (sessionGeneration !== session.generation) return;
          setLikeState((state) => sendSuccess(state, commentID, desired, result));
        } catch (error) {
          if (sessionGeneration !== session.generation) return;
          const kind = error instanceof EsportsServiceError ? error.kind : "network";
          if (kind === "comment_not_found") {
            removeCommentLocally(commentID);
          } else {
            setLikeState((state) => sendFailure(state, commentID));
            setComposerError(kind);
          }
        }
      });
    }, LIKE_DEBOUNCE_MS);
  }

  function removeCommentLocally(commentID: string) {
    setLikeState((state) => likeRemove(state, commentID));
    setThreadState((previous) => {
      const data = previous.data;
      const isTopLevel = data.rows.some((row) => row.id === commentID);
      const removedReplies = isTopLevel ? data.repliesByParent[commentID]?.length ?? 0 : 0;
      const nextReplies: Record<string, CommentRow[]> = {};
      for (const [parentID, replies] of Object.entries(data.repliesByParent)) {
        if (parentID === commentID) continue;
        nextReplies[parentID] = replies.filter((reply) => reply.id !== commentID);
      }
      setCount((value) => Math.max(0, value - (isTopLevel ? 1 + removedReplies : 1)));
      return {
        ...previous,
        data: {
          ...data,
          rows: data.rows.filter((row) => row.id !== commentID),
          repliesByParent: nextReplies,
        },
      };
    });
  }

  // ---------- 發佈 ----------
  const [body, setBody] = useState("");
  const [targetPlayerKey, setTargetPlayerKey] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [posting, setPosting] = useState(false);
  // 伺服器有 3 秒冷卻；成功後就地停用送出鈕同樣長（timeout 驅動）
  const [coolingDown, setCoolingDown] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  async function handlePost() {
    if (posting || coolingDown) return;
    if (session.status !== "signedIn" || !session.uid) {
      void session.signInWithApple().catch(() => {});
      return;
    }
    const uid = session.uid;
    const trimmed = body.trim();
    if (trimmed.length === 0 || trimmed.length > BODY_LIMIT) {
      setComposerError("invalid_body");
      return;
    }

    setPosting(true);
    setComposerError(null);
    // 快照送出當下的草稿與回覆對象：request 期間的編輯不被成功回覆清掉
    const submittedDraft = body;
    const submittedReplyTo = replyTo;
    try {
      const newID = await postComment({
        riotMatchID,
        body: trimmed,
        parentID: submittedReplyTo?.id ?? null,
        // 回覆的 player_key 由伺服器繼承父留言；參數會被忽略
        playerKey: submittedReplyTo ? null : targetPlayerKey,
        expectedUID: uid,
      });

      // 樂觀插入（created_at 空字串＝先不顯示時間，重整補上）
      const optimistic: CommentRow = {
        id: newID,
        riot_match_id: riotMatchID,
        parent_id: submittedReplyTo?.id ?? null,
        user_id: uid,
        body: trimmed,
        created_at: "",
        player_key: submittedReplyTo ? submittedReplyTo.player_key : targetPlayerKey,
        author: {
          id: uid,
          display_name: session.profile?.display_name ?? t("anonymousName"),
          avatar_card_id: session.profile?.avatar_card_id ?? null,
        },
      };
      setThreadState((previous) => {
        const data = previous.sort === sort ? previous.data : EMPTY_THREAD;
        if (optimistic.parent_id) {
          return {
            sort,
            data: {
              ...data,
              repliesByParent: {
                ...data.repliesByParent,
                [optimistic.parent_id]: [
                  ...(data.repliesByParent[optimistic.parent_id] ?? []),
                  optimistic,
                ],
              },
            },
          };
        }
        return { sort, data: { ...data, rows: [optimistic, ...data.rows] } };
      });
      setCount((value) => value + 1);
      setBody((current) => (current === submittedDraft ? "" : current));
      setReplyTo((current) =>
        (current?.id ?? null) === (submittedReplyTo?.id ?? null) ? null : current
      );
      setCoolingDown(true);
      setTimeout(() => setCoolingDown(false), COMMENT_COOLDOWN_MS);
    } catch (error) {
      const kind = error instanceof EsportsServiceError ? error.kind : "network";
      // 草稿保留；錯誤在 composer 下方呈現
      setComposerError(kind);
    } finally {
      setPosting(false);
    }
  }

  // ---------- 刪除／檢舉／封鎖（確認 modal） ----------
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function confirmPendingAction() {
    if (!pendingAction || pendingAction.type === "reported") return;
    const uid = session.uid;
    const { type, row } = pendingAction;
    setPendingAction(null);
    if (!uid) return;
    try {
      if (type === "delete") {
        await deleteComment(row.id);
        removeCommentLocally(row.id);
      } else if (type === "report") {
        await reportComment(row.id, uid);
        setPendingAction({ type: "reported" });
      } else {
        // 封鎖：樂觀進 context；失敗回滾（默默重現的留言＝壞掉的安全控制）。
        // forUID：await 期間換帳號的話，回滾不會動到新帳號的清單
        session.setBlockedLocally(row.user_id, true, uid);
        try {
          await blockUser(row.user_id, uid);
        } catch (error) {
          session.setBlockedLocally(row.user_id, false, uid);
          throw error;
        }
      }
    } catch (error) {
      const kind = error instanceof EsportsServiceError ? error.kind : "network";
      setComposerError(kind);
    }
  }

  function requireSignIn(action: (row: CommentRow) => void): (row: CommentRow) => void {
    return (row) => {
      if (session.status !== "signedIn") {
        void session.signInWithApple().catch(() => {});
        return;
      }
      action(row);
    };
  }

  // ---------- Render ----------
  const blocked = session.blockedIDs;
  const visibleRows = thread.rows.filter((row) => !blocked.has(row.user_id));

  const toViewModel = (row: CommentRow): CommentViewModel => ({
    row,
    likeCount: likeState.counts[row.id] ?? 0,
    likedByMe: likeState.mine[row.id] ?? false,
    isHot: (likeState.counts[row.id] ?? 0) >= HOT_MIN_LIKES,
    isOwn: session.uid !== null && row.user_id === session.uid,
    playerName: row.player_key ? playerNames[row.player_key] ?? null : null,
  });

  const actions = {
    interactionsEnabled,
    onToggleLike: toggleLike,
    onReply: (row: CommentRow) => {
      setReplyTo(row);
      setComposerError(null);
    },
    onReport: requireSignIn((row) => setPendingAction({ type: "report", row })),
    onBlock: requireSignIn((row) => setPendingAction({ type: "block", row })),
    onDelete: (row: CommentRow) => setPendingAction({ type: "delete", row }),
  };

  const playerOptions = Object.entries(playerNames);
  const targetLabel = (key: string | null) =>
    key === null ? t("wholeMatch") : playerNames[key] ?? key;

  const toggleClass = (active: boolean) =>
    [
      "cut-sm px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      active
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  return (
    <section aria-label={t("title")} className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-1">
          {t("title")}
          <span className="ml-2 font-ui text-sm font-bold text-text-3">{count}</span>
        </h2>
        <div className="flex gap-2" role="group" aria-label={t("sortLabel")}>
          <button type="button" onClick={() => setSort("hot")} aria-pressed={sort === "hot"} className={toggleClass(sort === "hot")}>
            {t("sortHot")}
          </button>
          <button type="button" onClick={() => setSort("newest")} aria-pressed={sort === "newest"} className={toggleClass(sort === "newest")}>
            {t("sortNewest")}
          </button>
        </div>
      </div>

      {/* Composer（window-gated） */}
      <div className="cut mt-4 border border-border-med bg-bg-panel p-4">
        {interactionsEnabled ? (
          <>
            {replyTo ? (
              <p className="flex items-center gap-2 font-ui text-xs text-text-2">
                {t("replyingTo", { name: replyTo.author?.display_name ?? t("anonymousName") })}
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-text-3 underline-offset-2 hover:text-text-1 hover:underline"
                >
                  {t("cancelReply")}
                </button>
              </p>
            ) : (
              playerOptions.length > 0 && (
                <div className="max-w-xs">
                  <HudSelect
                    id="comment-target"
                    value={targetLabel(targetPlayerKey)}
                    onChange={(label) => {
                      if (label === t("wholeMatch")) setTargetPlayerKey(null);
                      else {
                        const entry = playerOptions.find(([, name]) => name === label);
                        setTargetPlayerKey(entry?.[0] ?? null);
                      }
                    }}
                    options={[t("wholeMatch"), ...playerOptions.map(([, name]) => name)]}
                    placeholder={t("wholeMatch")}
                  />
                </div>
              )
            )}

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={BODY_LIMIT}
              rows={3}
              placeholder={session.status === "signedIn" ? t("composerPlaceholder") : t("signInToComment")}
              className="cut-sm mt-3 w-full resize-y border border-border-med bg-bg-elevated px-3 py-2.5 font-body text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-ui text-[11px] tabular-nums text-text-3">
                {body.trim().length}/{BODY_LIMIT}
              </span>
              <button
                type="button"
                disabled={posting || coolingDown || body.trim().length === 0}
                onClick={() => void handlePost()}
                className="cut-sm bg-val-red px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 disabled:opacity-50"
              >
                {posting ? t("sending") : t("send")}
              </button>
            </div>
            {composerError && (
              <p role="alert" className="mt-2 font-ui text-xs text-val-red">
                {tError(composerError)}
              </p>
            )}
          </>
        ) : (
          <p className="font-ui text-sm text-text-3">{t("closedNote")}</p>
        )}
      </div>

      {/* 清單（封鎖作者 render 時過濾；被濾空時 load-more 仍在） */}
      <div className="mt-4">
        {thread.rows.length === 0 && status === "loading" ? (
          <p role="status" className="py-12 text-center font-ui text-sm uppercase tracking-widest text-text-3">
            {t("loading")}
          </p>
        ) : thread.rows.length === 0 && status === "error" ? (
          <p role="alert" className="py-12 text-center font-ui text-sm text-text-2">
            {t("loadFailed")}
          </p>
        ) : visibleRows.length === 0 && !thread.hasMore ? (
          <p className="py-12 text-center font-ui text-sm text-text-2">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border-dim border-y border-border-dim">
            {visibleRows.map((row) => (
              <EsportsCommentRow
                key={row.id}
                comment={toViewModel(row)}
                replies={(thread.repliesByParent[row.id] ?? [])
                  .filter((reply) => !blocked.has(reply.user_id))
                  .map(toViewModel)}
                locale={locale}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </div>

      {thread.hasMore && status !== "loading" && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => void loadPage(sort, thread)}
            className="cut-sm border border-border-med px-6 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:border-border-bright hover:text-text-1"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
      {thread.rows.length > 0 && status === "loading" && (
        <p role="status" className="mt-5 text-center font-ui text-xs uppercase tracking-widest text-text-3">
          {t("loading")}
        </p>
      )}
      {thread.rows.length > 0 && status === "error" && (
        <p role="alert" className="mt-5 text-center font-ui text-xs text-text-2">
          {t("loadFailed")}
        </p>
      )}

      {/* 確認 modal（刪除／檢舉／封鎖）＋ 檢舉已受理 */}
      <HudModal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={
          pendingAction?.type === "delete"
            ? t("deleteTitle")
            : pendingAction?.type === "report"
              ? t("reportTitle")
              : pendingAction?.type === "block"
                ? t("blockTitle")
                : t("reportReceivedTitle")
        }
      >
        {pendingAction?.type === "reported" ? (
          <p className="font-body text-sm text-text-2">{t("reportReceivedBody")}</p>
        ) : (
          <>
            <p className="font-body text-sm text-text-2">
              {pendingAction?.type === "delete" && t("deleteBody")}
              {pendingAction?.type === "report" && t("reportBody")}
              {pendingAction?.type === "block" &&
                t("blockBody", {
                  name: pendingAction.row.author?.display_name ?? t("anonymousName"),
                })}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="cut-sm border border-border-med px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2 hover:border-border-bright hover:text-text-1"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void confirmPendingAction()}
                className="cut-sm bg-val-red px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base hover:brightness-110"
              >
                {t("confirm")}
              </button>
            </div>
          </>
        )}
      </HudModal>
    </section>
  );
}
