"use client";

import { useEffect, useRef, useState } from "react";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import {
  createReactionQueue,
  type ReactionQueue,
} from "@/lib/community/reaction-queue";
import type { ReactionKind } from "@/lib/community/types";

export interface ReactionState {
  mine: ReactionKind | null;
  likeCount: number;
  dislikeCount: number;
}

interface UseReactionOptions {
  /** 伺服器上這一列現在的狀態；列被重讀（換觀看者）時會換成新物件 */
  server: ReactionState;
  /** 換了物件才算換列（動態牆重讀後 props 上的列會換） */
  row: unknown;
  send: (kind: ReactionKind | null, uid: string) => Promise<ReactionState>;
  /** 現在的觀看者；舊觀看者的回應不進新觀看者的畫面 */
  uid: string | null;
}

/**
 * 一個目標的樂觀反應狀態：按下去先改畫面，佇列把最後的意圖送到伺服器，
 * 伺服器算好的計數回來覆蓋。任何失敗都退回最後一次伺服器確認過的狀態。
 */
export function useReaction({ server, row, send, uid }: UseReactionOptions) {
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const [state, setState] = useState<ReactionState>(server);

  // 列被重讀時跟著伺服器重設（登入後拿到自己的狀態、換帳號）。rowSerial 跟著
  // 加一，讓還在路上的請求知道它的答案已經不屬於畫面上這一列
  const [syncedRow, setSyncedRow] = useState(row);
  const [rowSerial, setRowSerial] = useState(0);
  if (syncedRow !== row) {
    setSyncedRow(row);
    setRowSerial((serial) => serial + 1);
    setState(server);
  }

  // 最後一次伺服器確認過的狀態，失敗時退回這裡。只在列換了的時候以 props 為準：
  // 呼叫端每次 render 都會組一個新的 server 物件，跟著它同步會把伺服器剛回覆
  // 的計數又蓋回舊的快照
  const confirmed = useRef(server);
  useEffect(() => {
    confirmed.current = server;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSerial]);

  const token = `${uid ?? ""}|${rowSerial}`;
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);
  const describeRef = useRef(describe);
  useEffect(() => {
    describeRef.current = describe;
  }, [describe]);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // 佇列在第一次按下時才建（事件處理器裡讀 ref 沒有問題）；它的回呼在請求
  // 回來時才讀那些 ref
  const queueRef = useRef<ReactionQueue | null>(null);
  const queue = (): ReactionQueue => {
    if (!queueRef.current) {
      queueRef.current = createReactionQueue<ReactionState>({
        send: (kind, forToken) => sendRef.current(kind, forToken.split("|")[0]),
        onSettled: (settled, forToken, final) => {
          // 換帳號或列被重讀了：這是上一個畫面的答案
          if (tokenRef.current !== forToken) return;
          // 中途的答案也是伺服器此刻的真相：之後失敗要退回這裡，不是退回更早的快照
          confirmed.current = settled;
          if (final) setState(settled);
        },
        onError: (error, forToken) => {
          if (tokenRef.current !== forToken) return;
          setState(confirmed.current);
          notifyRef.current("error", describeRef.current(error));
        },
      });
    }
    return queueRef.current;
  };

  /** 按下某一種：已經是它就收回，否則換成它 */
  const react = (kind: ReactionKind) => {
    if (!uid) return false;
    // 用這次 render 的 state 算下一步，副作用（排進送出佇列）留在事件處理器裡，
    // 不放進 setState 的 updater——updater 可能被 React 重跑，會重複送請求
    const current = state;
    const next: ReactionKind | null = current.mine === kind ? null : kind;
    queue().request(next, token);
    // 樂觀更新：舊的那一種先減、新的那一種再加
    setState({
      mine: next,
      likeCount:
        current.likeCount +
        (next === "like" ? 1 : 0) -
        (current.mine === "like" ? 1 : 0),
      dislikeCount:
        current.dislikeCount +
        (next === "dislike" ? 1 : 0) -
        (current.mine === "dislike" ? 1 : 0),
    });
    return true;
  };

  return { state, react };
}
