"use client";

// 寫手名單（管理員）。加人的流程：對方先在這個網站用 Apple 登入一次，
// 進 /admin/articles 會看到自己的 ID，把 ID 交給管理員貼進來。

import { useCallback, useEffect, useState } from "react";
import { AdminRequestError } from "@/lib/admin/client";
import { articlesApi } from "@/lib/admin/articles/client";
import { humanizeRpcError, type WriterRow } from "@/lib/admin/articles/types";
import { button, input, panel, primary } from "../styles";

function describe(err: unknown): string {
  if (err instanceof AdminRequestError) return humanizeRpcError(err.message);
  return err instanceof Error ? err.message : "發生錯誤";
}

export default function WritersPanel() {
  const [rows, setRows] = useState<WriterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    try {
      const { items } = await articlesApi.writers();
      setRows(items);
      setError(null);
    } catch (err) {
      setError(describe(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    articlesApi
      .writers()
      .then(({ items }) => alive && setRows(items))
      .catch((err) => alive && setError(describe(err)));
    return () => {
      alive = false;
    };
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await articlesApi.setWriter({
        user_id: userId.trim(),
        display_name: name.trim(),
        active: true,
        note: note.trim() || undefined,
      });
      setUserId("");
      setName("");
      setNote("");
      await reload();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: WriterRow) {
    setBusy(true);
    setError(null);
    try {
      await articlesApi.setWriter({
        user_id: row.user_id,
        display_name: row.display_name,
        active: !row.active,
        note: row.note ?? undefined,
      });
      await reload();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`${panel} space-y-2`}>
        <h2 className="text-sm font-semibold">加入寫手</h2>
        <p className="text-xs opacity-60">
          對方先到 dailyval.com/admin/articles 用 Apple 登入一次，頁面會顯示他的 ID；把 ID 貼在這裡。
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className={input}
            placeholder="使用者 ID（uuid）"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <input
            className={input}
            placeholder="署名（文章上顯示的名字）"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={input}
            placeholder="備註（選填，只有管理員看得到）"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button className={primary} disabled={busy || !userId.trim() || !name.trim()} onClick={() => void add()}>
          加入或更新
        </button>
        {error && <p className="text-sm text-[var(--val-red)]">{error}</p>}
      </div>

      <div className={panel}>
        <h2 className="text-sm font-semibold mb-2">名單</h2>
        {rows === null ? (
          <p className="text-sm opacity-60">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm opacity-60">還沒有寫手。</p>
        ) : (
          <ul className="divide-y divide-[var(--border-dim)]">
            {rows.map((row) => (
              <li key={row.user_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className={`font-semibold ${row.active ? "" : "opacity-50 line-through"}`}>
                  {row.display_name}
                </span>
                <span className="font-mono text-xs opacity-50">{row.user_id}</span>
                <span className="text-xs opacity-60">{row.article_count} 篇</span>
                {row.note && <span className="text-xs opacity-60">{row.note}</span>}
                <button className={`${button} ml-auto`} disabled={busy} onClick={() => void toggle(row)}>
                  {row.active ? "停用" : "啟用"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
