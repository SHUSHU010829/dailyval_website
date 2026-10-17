"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";

// 社群板的輕量提示（取代 sonner）：一疊 aria-live="polite" 的通知，
// 數秒後自動消失，也可以手動關掉。

export type NoticeKind = "success" | "error" | "info";

interface Notice {
  id: number;
  kind: NoticeKind;
  message: string;
}

interface NoticeApi {
  notify(kind: NoticeKind, message: string): void;
}

const NoticeContext = createContext<NoticeApi | null>(null);

const AUTO_DISMISS_MS = 4000;
const MAX_VISIBLE = 3;

export function useCommunityNotice(): NoticeApi {
  const api = useContext(NoticeContext);
  if (!api) {
    throw new Error("useCommunityNotice 必須在 CommunityNoticeProvider 內使用");
  }
  return api;
}

const KIND_STYLE: Record<NoticeKind, string> = {
  success: "border-viper-green/40 text-viper-green",
  error: "border-val-red/40 text-val-red",
  info: "border-border-bright text-text-1",
};

function NoticeItem({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss: (id: number) => void;
}) {
  const t = useTranslations("communityBoard.a11y");
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice.id, onDismiss]);

  return (
    <div
      className={`cut-sm pointer-events-auto flex items-start gap-3 border bg-bg-elevated px-4 py-3 font-body text-sm ${KIND_STYLE[notice.kind]}`}
    >
      <span className="flex-1 text-text-1">{notice.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(notice.id)}
        aria-label={t("dismissNotice")}
        className="text-text-3 hover:text-text-1"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}

export default function CommunityNoticeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [nextId, setNextId] = useState(1);

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback(
    (kind: NoticeKind, message: string) => {
      setNotices((current) =>
        [...current, { id: nextId, kind, message }].slice(-MAX_VISIBLE),
      );
      setNextId((id) => id + 1);
    },
    [nextId],
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <NoticeContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2 md:bottom-6"
      >
        {notices.map((notice) => (
          <NoticeItem key={notice.id} notice={notice} onDismiss={dismiss} />
        ))}
      </div>
    </NoticeContext.Provider>
  );
}
