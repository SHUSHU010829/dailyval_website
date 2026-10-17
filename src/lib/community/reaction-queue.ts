// 反應（讚／噓）的送出佇列：一個目標同時只有一個請求在路上。
//
// 為什麼不是「送出去、最後回來的算數」：兩個請求各自進資料庫，順序由網路
// 決定。先按讚再取消，取消可能先到——資料庫最後是「讚」，畫面卻顯示「沒有」。
// 伺服器的 advisory lock 只保證兩次不互相踩，不知道哪一次是使用者最後的意思。
// 所以這裡只記最新的意圖，前一個請求回來之後，意圖還不一樣才送下一個；
// 資料庫最後的狀態因此一定等於使用者最後一次按的那個。

import type { ReactionKind } from "@/lib/community/types";

/**
 * token 是「這次意圖屬於誰、屬於哪一列」：呼叫端用帳號與列的世代組成，
 * 回應回來時對不上就代表帳號換了或列被重讀了，那個答案不該落在畫面上。
 */
export interface ReactionQueue {
  request(kind: ReactionKind | null, token: string): void;
}

export interface ReactionQueueOptions<S> {
  send: (kind: ReactionKind | null, token: string) => Promise<S>;
  /**
   * 伺服器回了一次答案。final 為 true 代表那就是最後的意圖，畫面可以定下來；
   * false 代表意圖在等待期間又變了、佇列會再送——但這個答案仍然是伺服器此刻
   * 的真相，失敗時退回的基準要跟著它走。
   */
  onSettled: (state: S, token: string, final: boolean) => void;
  /** 某一次請求失敗；之後若還有更新的意圖，佇列會接著送 */
  onError: (error: unknown, token: string) => void;
}

interface Intent {
  kind: ReactionKind | null;
  token: string;
}

// 意圖以「物件」而不是「值」分辨：按讚、收回、再按讚，第三次跟第一次的值一樣，
// 但它是更新的意圖，第一次失敗時不能把它當成同一個丟掉
export function createReactionQueue<S>(
  options: ReactionQueueOptions<S>,
): ReactionQueue {
  let desired: Intent | null = null;
  let running = false;

  const drain = async () => {
    running = true;
    let sent: Intent | null = null;
    try {
      while (desired && desired !== sent) {
        sent = desired;
        try {
          const state = await options.send(sent.kind, sent.token);
          // 等待期間意圖又變了就再送一次；沒變才算定下來
          options.onSettled(state, sent.token, desired === sent);
        } catch (error) {
          options.onError(error, sent.token);
          // 失敗的是這一次；等待期間如果來了更新的意圖，它還沒送過，不能一起丟掉
          if (desired === sent) desired = null;
        }
      }
    } finally {
      running = false;
    }
  };

  return {
    request(kind, token) {
      desired = { kind, token };
      if (!running) void drain();
    },
  };
}
