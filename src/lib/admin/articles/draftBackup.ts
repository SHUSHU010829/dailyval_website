// 編輯中的草稿在瀏覽器裡的備份。每次修改都寫一份到 localStorage，儲存成功就清掉；
// 重新打開同一篇時，備份比伺服器那一版新就問要不要恢復。
//
// 為什麼是備份而不是攔截每一種離開：站內的按鈕可以問一聲，關分頁可以靠
// beforeunload，但瀏覽器的上一頁／下一頁手勢走 popstate，Next 自己處理，
// 攔不到；與其一種一種堵，不如讓任何離開都不會掉字。
//
// 沒有 server-only、沒有 React：純函式，測得到。

import type { ArticleDraft } from "./types";

export interface DraftBackup {
  draft: ArticleDraft;
  /** 寫入時間，ISO 字串。 */
  savedAt: string;
}

/** 每個帳號、每篇文章一格；新文章是 "new"。 */
export function draftBackupKey(uid: string, articleId: string | null): string {
  return `dailyval.articles.draft:${uid}:${articleId ?? "new"}`;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // 私密瀏覽或被封鎖的儲存空間：沒有備份也要能編輯。
    return null;
  }
}

export function readDraftBackup(key: string, store: StorageLike | null = storage()): DraftBackup | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftBackup>;
    if (!parsed || typeof parsed !== "object" || !parsed.draft || typeof parsed.savedAt !== "string") return null;
    if (Number.isNaN(Date.parse(parsed.savedAt))) return null;
    return { draft: parsed.draft, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeDraftBackup(
  key: string,
  draft: ArticleDraft,
  now: Date = new Date(),
  store: StorageLike | null = storage()
): void {
  try {
    store?.setItem(key, JSON.stringify({ draft, savedAt: now.toISOString() } satisfies DraftBackup));
  } catch {
    // 空間滿了或被封鎖：備份失敗不能影響編輯。
  }
}

export function clearDraftBackup(key: string, store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(key);
  } catch {
    // 同上。
  }
}

/**
 * 要不要提議恢復：備份的內容跟伺服器那一版不一樣就問（新文章沒有伺服器版本，
 * 有備份就問）。時間不拿來當門檻：管理員下架、恢復、發布都會推 updated_at 而
 * 內文一個字都沒動，用時間判斷會把還沒存的修改當成舊的丟掉。伺服器真的比備份
 * 新的話（別台電腦改過），`serverIsNewer` 讓畫面把這件事講出來，決定權在寫手。
 */
export function shouldOfferRestore(
  backup: DraftBackup | null,
  server: { updatedAt: string | null; draft: ArticleDraft } | null
): boolean {
  if (!backup) return false;
  if (!server) return true;
  return !sameDraft(backup.draft, server.draft);
}

export function serverIsNewer(backup: DraftBackup, serverUpdatedAt: string | null): boolean {
  if (!serverUpdatedAt) return false;
  return Date.parse(serverUpdatedAt) > Date.parse(backup.savedAt);
}

export function sameDraft(a: ArticleDraft, b: ArticleDraft): boolean {
  return (
    a.slug === b.slug &&
    a.title === b.title &&
    a.summary === b.summary &&
    a.body_md === b.body_md &&
    (a.cover_url ?? null) === (b.cover_url ?? null) &&
    a.category === b.category &&
    a.lang === b.lang
  );
}
