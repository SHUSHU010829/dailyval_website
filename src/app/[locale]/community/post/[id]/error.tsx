"use client";

import { useTranslations } from "next-intl";

export default function CommunityPostError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("communityBoard.postError");

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <h1 className="font-display text-3xl font-black text-text-1">
        {t("title")}
      </h1>
      <h2 className="mt-1 font-ui text-sm font-semibold text-text-3">
        {t("subtitle")}
      </h2>
      <p className="cut-sm mt-6 border border-border-med p-3 font-body text-sm text-val-red">
        <span className="font-bold text-text-1">{t("messageLabel")} </span>
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="cut-sm mt-8 border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
      >
        {t("retry")}
      </button>
    </div>
  );
}
