// 按讚狀態機的純轉移函數（iOS EsportsCommentsViewModel 的 like 機制
// 1:1 移植；計時器、送出鏈、generation 檢查在 useLikes hook 裡）。
// 核心規則：
// - 點按即時翻面；網路只在點按沉澱後送「最終想要的狀態」（SET 語意）
// - 失敗回滾的基準是「伺服器確認過的狀態」，沒有才用「整條 chain 開始
//   前的狀態」——絕不是「送出值的反面」（兩次快點可能回到原點，取反
//   會憑空捏造一個讚）
// - 批次合併絕不碰有 pending sender 或快照後動過（revision 變了）的 id

export interface LikeChainState {
  /** UI 顯示的讚數 */
  counts: Record<string, number>;
  /** UI 顯示的我是否已讚 */
  mine: Record<string, boolean>;
  /** 伺服器確認過的真值（RPC 回覆或批次讀） */
  confirmedCounts: Record<string, number>;
  confirmedLiked: Record<string, boolean>;
  /** 進行中的點按 chain 的「開始前」狀態（整條 chain 一體回滾） */
  chains: Record<string, { preChainLiked: boolean; preChainCount: number }>;
  /** 每次本地變動 +1；批次合併以此看穿「送出已確認並退場」的空窗 */
  revisions: Record<string, number>;
}

export const EMPTY_LIKE_STATE: LikeChainState = {
  counts: {},
  mine: {},
  confirmedCounts: {},
  confirmedLiked: {},
  chains: {},
  revisions: {},
};

function bumpRevision(revisions: Record<string, number>, id: string) {
  return { ...revisions, [id]: (revisions[id] ?? 0) + 1 };
}

function omitKey<T>(record: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

/** 點一下：翻面＋讚數 ±1；chain 的第一下記住 pre-chain 狀態 */
export function tap(state: LikeChainState, id: string): LikeChainState {
  const currentlyLiked = state.mine[id] ?? false;
  const willLike = !currentlyLiked;
  const currentCount = state.counts[id] ?? 0;

  return {
    ...state,
    mine: { ...state.mine, [id]: willLike },
    counts: {
      ...state.counts,
      [id]: willLike ? currentCount + 1 : Math.max(0, currentCount - 1),
    },
    chains: state.chains[id]
      ? state.chains
      : {
          ...state.chains,
          [id]: { preChainLiked: currentlyLiked, preChainCount: currentCount },
        },
    revisions: bumpRevision(state.revisions, id),
  };
}

/**
 * 送出成功：伺服器回覆進 confirmed；UI 讚數只在「本地想要的狀態仍等於
 * 這次送出的狀態」時採用權威值（更新的點按擁有 UI）。chain 退場。
 */
export function sendSuccess(
  state: LikeChainState,
  id: string,
  sentLiked: boolean,
  result: { liked: boolean; likeCount: number }
): LikeChainState {
  const remainingChains = omitKey(state.chains, id);
  const desireStillMatches = (state.mine[id] ?? false) === sentLiked;
  return {
    ...state,
    confirmedLiked: { ...state.confirmedLiked, [id]: result.liked },
    confirmedCounts: { ...state.confirmedCounts, [id]: result.likeCount },
    counts: desireStillMatches
      ? { ...state.counts, [id]: result.likeCount }
      : state.counts,
    chains: desireStillMatches ? remainingChains : state.chains,
    revisions: bumpRevision(state.revisions, id),
  };
}

/** 送出失敗：回滾到 confirmed（有聽過伺服器）否則 pre-chain；chain 退場 */
export function sendFailure(state: LikeChainState, id: string): LikeChainState {
  const chain = state.chains[id];
  const baselineLiked = state.confirmedLiked[id] ?? chain?.preChainLiked ?? false;
  const baselineCount =
    state.confirmedCounts[id] ?? chain?.preChainCount ?? state.counts[id] ?? 0;
  const remainingChains = omitKey(state.chains, id);
  return {
    ...state,
    mine: { ...state.mine, [id]: baselineLiked },
    counts: { ...state.counts, [id]: baselineCount },
    chains: remainingChains,
    revisions: bumpRevision(state.revisions, id),
  };
}

/** 留言被刪（comment_not_found）：清掉所有相關條目 */
export function removeComment(state: LikeChainState, id: string): LikeChainState {
  return {
    counts: omitKey(state.counts, id),
    mine: omitKey(state.mine, id),
    confirmedCounts: omitKey(state.confirmedCounts, id),
    confirmedLiked: omitKey(state.confirmedLiked, id),
    chains: omitKey(state.chains, id),
    revisions: omitKey(state.revisions, id),
  };
}

export function snapshotRevisions(
  state: LikeChainState,
  ids: string[]
): Record<string, number> {
  const snapshot: Record<string, number> = {};
  for (const id of ids) snapshot[id] = state.revisions[id] ?? 0;
  return snapshot;
}

/**
 * 批次合併（讚數讀＋我的讚讀，各自可缺席——失敗的一側保留快取值）。
 * settled＝現在沒有 pending chain「且」快照後 revision 沒動過的 id 才
 * 覆寫 UI；未 settled 的 id 只在 confirmed 缺席時記為基準（回滾用）。
 */
export function mergeBatch(
  state: LikeChainState,
  ids: string[],
  counts: Record<string, number> | null,
  mine: Set<string> | null,
  revisionSnapshot: Record<string, number>
): LikeChainState {
  const settled = new Set(
    ids.filter(
      (id) =>
        state.chains[id] === undefined &&
        (state.revisions[id] ?? 0) === (revisionSnapshot[id] ?? 0)
    )
  );

  const next = {
    ...state,
    counts: { ...state.counts },
    mine: { ...state.mine },
    confirmedCounts: { ...state.confirmedCounts },
    confirmedLiked: { ...state.confirmedLiked },
  };

  if (counts) {
    for (const id of ids) {
      const value = counts[id] ?? 0;
      if (settled.has(id)) {
        next.counts[id] = value;
        next.confirmedCounts[id] = value;
      } else if (next.confirmedCounts[id] === undefined) {
        next.confirmedCounts[id] = value;
      }
    }
  }
  if (mine) {
    for (const id of ids) {
      const value = mine.has(id);
      if (settled.has(id)) {
        next.mine[id] = value;
        next.confirmedLiked[id] = value;
      } else if (next.confirmedLiked[id] === undefined) {
        next.confirmedLiked[id] = value;
      }
    }
  }
  return next;
}

/**
 * 帳號轉換：pending 的 id 回到 confirmed（否則 pre-chain）讚數；
 * 我的讚與 confirmedLiked 清空（讚數是全域的，保留）。
 */
export function accountReset(state: LikeChainState): LikeChainState {
  const counts = { ...state.counts };
  for (const [id, chain] of Object.entries(state.chains)) {
    counts[id] = state.confirmedCounts[id] ?? chain.preChainCount;
  }
  return {
    counts,
    mine: {},
    confirmedCounts: state.confirmedCounts,
    confirmedLiked: {},
    chains: {},
    revisions: state.revisions,
  };
}
