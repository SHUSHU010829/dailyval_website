"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 把內容渲染到 document.body 底下。
// 貼文卡片用 `cut`（clip-path 切角），clip-path 會連同裡面 position: fixed 的
// 子孫一起裁掉，全螢幕大圖與對話框因此只看得到卡片那一塊。要全螢幕的東西
// 一律走這裡，不要留在卡片的 DOM 裡。

const subscribe = () => () => {};

export default function Portal({ children }: { children: ReactNode }) {
  // 伺服器端沒有 document：用 useSyncExternalStore 取得「是否已在瀏覽器」
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return inBrowser ? createPortal(children, document.body) : null;
}
