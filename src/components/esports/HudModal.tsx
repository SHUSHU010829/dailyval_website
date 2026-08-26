"use client";

import { useEffect, useRef, type ReactNode } from "react";

// 簡單的 HUD 風格 modal（本 repo 沒有 Radix，不為此引依賴）。
// Escape 或點背景關閉；開啟時鎖 body 捲動、focus 移進面板。

interface HudModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
}

export default function HudModal({ open, onClose, title, children }: HudModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="cut relative max-h-[85vh] w-full max-w-lg overflow-y-auto border border-border-bright bg-bg-panel p-6 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-1">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="p-1 font-ui text-lg leading-none text-text-3 transition-colors hover:text-text-1"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
