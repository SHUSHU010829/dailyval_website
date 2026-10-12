"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { fetchRoomCode } from "@/lib/teamup/rooms";

type CodeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "code"; code: string; copied: boolean }
  | { kind: "refused"; reason: "full" | "closed" | "disabled" }
  | { kind: "error" };

/**
 * Safari 只在使用者按下的那一刻允許寫剪貼簿，等代碼從伺服器回來時那一刻已經過了。
 * ClipboardItem 收一個 promise：按下時先占位，內容晚點才到，所以一次點擊就能複製。
 * 不支援的瀏覽器退回 writeText（Chrome 只要分頁在前景就允許）。
 */
async function copyWhenReady(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": text.then((value) => new Blob([value], { type: "text/plain" })) }),
      ]);
      return true;
    }
  } catch {
    // 退回 writeText
  }
  try {
    await navigator.clipboard.writeText(await text);
    return true;
  } catch {
    return false;
  }
}

const buttonClass = "cut-sm inline-flex min-h-11 items-center justify-center px-5 py-2 font-ui text-sm font-bold uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue disabled:cursor-not-allowed";

/** 一間房的「複製代碼」。代碼只在按下時跟伺服器拿，伺服器每次都替這間房記一筆。 */
export default function RoomCodeButton({ roomId, serverLabel, codesEnabled, full }: {
  roomId: string;
  serverLabel: string;
  codesEnabled: boolean;
  full: boolean;
}) {
  const t = useTranslations("rooms.code");
  const [state, setState] = useState<CodeState>({ kind: "idle" });

  async function reveal() {
    setState({ kind: "loading" });
    const pending = fetchRoomCode(roomId);
    const copied = copyWhenReady(pending.then((result) =>
      result.kind === "code" ? result.code : Promise.reject(new Error(result.kind))));
    const result = await pending;
    if (result.kind === "code") {
      setState({ kind: "code", code: result.code, copied: await copied });
    } else {
      setState(result.kind === "refused" ? { kind: "refused", reason: result.reason } : { kind: "error" });
    }
  }

  async function copyAgain(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setState({ kind: "code", code, copied: true });
    } catch {
      setState({ kind: "code", code, copied: false });
    }
  }

  if (!codesEnabled) return <p className="text-sm leading-relaxed text-text-3">{t("disabled")}</p>;

  if (state.kind === "code") {
    return (
      <div>
        <p className="font-ui text-xs uppercase tracking-widest text-text-3">{t("label")}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {/* 等寬字：複製失敗時要照著打，0 和 O、1 和 I 不能長得像。 */}
          <span className="select-all font-mono text-3xl font-bold tracking-[0.15em] text-text-1">{state.code}</span>
          <button type="button" onClick={() => copyAgain(state.code)}
            className={`${buttonClass} border border-border-med text-text-1 hover:border-jett-blue`}>
            {t("copy")}
          </button>
        </div>
        <p role="status" className={`mt-2 text-sm leading-relaxed ${state.copied ? "text-viper-green" : "text-text-2"}`}>
          {state.copied ? t("copied") : t("copyFailed")}
        </p>
      </div>
    );
  }

  const message =
    state.kind === "refused" ? t(state.reason)
    : state.kind === "error" ? t("error")
    : t("sameServer", { server: serverLabel });
  const closed = state.kind === "refused" && state.reason !== "full";
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {!closed && (
        <button type="button" onClick={reveal} disabled={full || state.kind === "loading"}
          aria-busy={state.kind === "loading"}
          className={`${buttonClass} bg-val-red text-bg-base hover:bg-val-red/85 disabled:bg-border-med disabled:text-text-3`}>
          {state.kind === "loading" ? t("loading") : state.kind === "error" ? t("retry") : t("get")}
        </button>
      )}
      <p role="status" className={`text-sm leading-relaxed ${state.kind === "error" || state.kind === "refused" ? "text-text-1" : "text-text-3"}`}>
        {message}
      </p>
    </div>
  );
}
