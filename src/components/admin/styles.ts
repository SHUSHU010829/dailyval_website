// 後台共用的樣式常數。AdminConsole.tsx 裡還有一份同值的本地常數，那個檔案
// 太大不值得為了這幾行去動它；新的後台頁面從這裡拿。
export const panel = "border border-[var(--border-dim)] bg-[var(--bg-panel)] rounded-lg p-4";
export const button =
  "px-3 py-1.5 rounded border border-[var(--border-med)] text-sm " +
  "hover:bg-[var(--bg-panel-hover)] disabled:opacity-40 disabled:cursor-not-allowed";
export const primary = `${button} border-[var(--jett-blue)] text-[var(--jett-blue)]`;
export const danger = `${button} border-[var(--val-red)] text-[var(--val-red)]`;
export const input =
  "w-full bg-[var(--bg-elevated)] border border-[var(--border-dim)] rounded " +
  "px-2 py-1.5 text-sm";
