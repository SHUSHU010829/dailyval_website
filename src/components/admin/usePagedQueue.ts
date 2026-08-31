"use client";

// 後台三個分頁共用的分頁狀態。獨立成一個檔案是因為它的算術已經出過三次錯,
// 而每一次都只在真實資料上才看得出來。有測試比有註解重要。

import { useCallback, useEffect, useRef, useState } from "react";

// AdminRequestError 帶著給人看的訊息;其他的例外不要把內部字串倒到畫面上。
// 用 name 而不是 instanceof,是為了不把 supabase 客戶端拖進這個模組——它是
// 這裡唯一需要瀏覽器環境的東西,而這個 hook 的算術值得能單獨測。
function messageOf(err: unknown): string {
  return err instanceof Error && err.name === "AdminRequestError"
    ? err.message
    : "載入失敗";
}

export interface PagedQueueOptions<T> {
  /** 跟伺服器要一頁。offset 由這個 hook 算，呼叫端不要自己算。 */
  fetchPage: (offset: number) => Promise<T[]>;
  /** 從一頁的內容讀出總數。空的一頁代表伺服器就到 from 為止。 */
  totalOf: (rows: T[], from: number) => number;
  keyOf: (row: T) => string;
  /**
   * 換掉它就從頭載入。篩選條件放這裡。
   *
   * 三個回呼都收在 ref 裡，所以 load 的 identity 是固定的——呼叫端寫成行內
   * 箭頭函式也不會變成「每次 render 都重新載入」的無窮迴圈。要重載就換這個
   * 值，那是唯一的開關，看得見也測得到。
   */
  resetKey?: unknown;
}

export function usePagedQueue<T>(opts: PagedQueueOptions<T>) {
  const { resetKey } = opts;
  const fetchPage = useRef(opts.fetchPage);
  const totalOf = useRef(opts.totalOf);
  const keyOf = useRef(opts.keyOf);
  fetchPage.current = opts.fetchPage;
  totalOf.current = opts.totalOf;
  keyOf.current = opts.keyOf;

  const [rows, setRows] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  // served = 伺服器總共給過幾列（只增）；closed = 其中幾列已經被處置掉。
  //
  // 下一頁的位置是兩者相減，**不能**用畫面上的列數。伺服器的佇列會隨著處置
  // 縮短——拿了 1–50、結案掉第 1 筆之後，原本的第 51 筆在伺服器那邊已經移到
  // 第 50 個位置，再要 offset 50 就會從第 52 筆開始，第 51 筆整個 session
  // 都不會再出現。
  const [served, setServed] = useState(0);
  const [closed, setClosed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 每一次載入拿一個號碼牌，只有最新的那一次可以寫進 state。切換篩選會換掉
  // fetchPage，而上一個篩選的請求可能晚一步回來——沒有這道柵欄的話，「已處置」
  // 的列會被畫進「待處理」清單，而按鈕的可用性是照**目前的**篩選算的，於是
  // 一件已經結掉的案子會帶著下架和刪除的按鈕出現。
  const generation = useRef(0);
  // 資料集的身分,只在「從頭載入」時前進。分頁載入不算換資料集,所以
  // 「載入更多」不會讓一個進行中的處置失效。
  const dataset = useRef(0);
  const offset = served - closed;

  const load = useCallback(async (from: number) => {
    const mine = (generation.current += 1);
    setLoading(true);
    // 從頭載入代表換了資料集，舊的列不能留在畫面上等新的回來。
    if (from === 0) setRows(null);
    try {
      const items = await fetchPage.current(from);
      if (mine !== generation.current) return;
      setRows((prev) => (from === 0 || !prev ? items : [...prev, ...items]));
      // from === 0 是重新開始，不是接續：StrictMode 會把掛載時的 effect 跑
      // 兩次，用累加的話 served 會變成兩倍。
      setServed((n) => (from === 0 ? items.length : n + items.length));
      if (from === 0) {
        setClosed(0);
        dataset.current += 1;
      }
      setTotal(totalOf.current(items, from));
      setError(null);
    } catch (err) {
      if (mine !== generation.current) return;
      if (from === 0) setRows([]);
      setError(messageOf(err));
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load, resetKey]);

  // 這一頁處理完但後面還有的時候自動接上。少了這個，清掉前 50 個之後畫面會
  // 顯示「沒有待處理的」，而後面還有好幾百。空的一頁會把 total 收到目前位置
  // （totalOf 的 from），所以這個條件不會永遠成立。
  useEffect(() => {
    if (rows && rows.length === 0 && offset < total && !loading) {
      void load(offset);
    }
  }, [rows, offset, total, loading, load]);

  /** 動作開始時先拿著它，完成時交回去。見 remove。 */
  const datasetToken = useCallback(() => dataset.current, []);

  /**
   * 把一列從畫面上拿掉，並把 offset 跟著縮。
   *
   * **只有在這一列真的離開了伺服器目前這個篩選的資料集時才呼叫。** 在「已處置」
   * 底下按下架不會改變任何檢舉的狀態，那一列還在伺服器那邊；當成離開了會讓
   * offset 少算一格，下一頁就會重複。
   *
   * token 是動作開始時的資料集身分。處置是非同步的，中途可以切換篩選：在
   * 「待審」按下通過、切到「已通過」、新的一頁載完、然後那個動作才回來——
   * 沒有這個 token 的話，它會把剛通過的那個人從**新的**資料集裡拿掉，並且
   * 動到新資料集的分頁計數。過期的移除直接忽略，新的資料集本來就已經是
   * 處置之後的樣子了。
   */
  const remove = useCallback((key: string, token?: number) => {
    if (token !== undefined && token !== dataset.current) return;
    setRows((prev) => prev?.filter((r) => keyOf.current(r) !== key) ?? prev);
    setClosed((n) => n + 1);
    setTotal((n) => Math.max(0, n - 1));
  }, []);

  return { rows, total, offset, loading, error, load, remove, datasetToken };
}
