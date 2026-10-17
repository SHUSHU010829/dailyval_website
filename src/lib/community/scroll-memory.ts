// 「點進貼文再回來，要回到剛剛滑到的位置」的記憶。
// 點進貼文（或作者頁）前記下列表頁的路徑與捲動位置（sessionStorage，只活在這個分頁），
// 列表頁回來時還原。路徑也一起記：從動態牆點進去的位置，不能拿來還原作者頁。

const KEY = "community:scroll";

export interface ScrollMemory {
  path: string;
  y: number;
  /** 點進的是哪一篇貼文；點作者名字進作者頁時沒有 */
  postId?: string;
}

/** sessionStorage 在隱私模式或被擋時會丟例外：記不住就算了，不影響功能 */
export function saveScroll(entry: ScrollMemory): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // 忽略
  }
}

/** 取出但不清除：還原成功之後才清（React StrictMode 會把 effect 跑兩次） */
export function peekScroll(path: string): ScrollMemory | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScrollMemory>;
    if (
      parsed.path !== path ||
      typeof parsed.y !== "number" ||
      !Number.isFinite(parsed.y) ||
      parsed.y < 0 ||
      (parsed.postId !== undefined && typeof parsed.postId !== "string")
    ) {
      return null;
    }
    return { path: parsed.path, y: parsed.y, postId: parsed.postId };
  } catch {
    return null;
  }
}

export function clearScroll(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 忽略
  }
}
