"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "@/components/community/ConfirmDialog";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import Icon from "@/components/Icon";
import {
  blockAuthor,
  deleteComment,
  deletePost,
  reportContent,
} from "@/lib/community/service";
import type { TargetKind } from "@/lib/community/types";

// 貼文／留言右上角的動作選單：
// - 自己的內容：刪除（要確認）
// - 別人的內容：檢舉、封鎖作者（封鎖要確認）
// 每個寫入都帶「互動當下」抓到的 uid，半路換帳號由伺服器以 uid_mismatch 擋下。

interface PostActionsMenuProps {
  kind: TargetKind;
  targetId: string;
  authorId: string | null;
  /** 這位觀看者已經檢舉過了 */
  didReport?: boolean;
  /** 刪除成功 */
  onRemoved?: () => void;
  /** 封鎖成功：伺服器之後會過濾，呼叫端要把這位作者的內容收掉或重讀 */
  onBlocked?: () => void;
}

type Pending = "delete" | "block" | null;

const itemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left font-ui text-xs uppercase tracking-wider text-text-2 transition-colors hover:bg-bg-panel hover:text-text-1 disabled:opacity-50";

export default function PostActionsMenu({
  kind,
  targetId,
  authorId,
  didReport = false,
  onRemoved,
  onBlocked,
}: PostActionsMenuProps) {
  const t = useTranslations("communityBoard.post");
  const tActions = useTranslations("communityBoard.actions");
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const { uid } = useCommunitySession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(didReport);
  const rootRef = useRef<HTMLDivElement>(null);

  // 點選單外面或按 Escape 就收起來
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 沒登入沒有任何可做的動作
  if (!uid) return null;

  const isOwn = Boolean(authorId && authorId === uid);

  const run = async (action: (expectedUid: string) => Promise<void>) => {
    const expectedUid = uid;
    setBusy(true);
    try {
      await action(expectedUid);
    } catch (error) {
      notify("error", describe(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const handleReport = () => {
    setOpen(false);
    void run(async (expectedUid) => {
      await reportContent(kind, targetId, expectedUid);
      setReported(true);
      notify("success", t("reportSuccess"));
    });
  };

  const handleDelete = () =>
    run(async (expectedUid) => {
      if (kind === "post") await deletePost(targetId, expectedUid);
      else await deleteComment(targetId, expectedUid);
      notify(
        "success",
        kind === "post" ? t("deleteSuccess") : t("commentDeleted"),
      );
      onRemoved?.();
    });

  const handleBlock = () =>
    run(async (expectedUid) => {
      await blockAuthor(kind, targetId, expectedUid);
      notify("success", t("blockSuccess"));
      onBlocked?.();
    });

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("moreActions")}
        className="flex size-8 items-center justify-center text-text-3 transition-colors hover:text-text-1"
      >
        <Icon name="DotsThree" size={20} />
      </button>

      {open && (
        <div
          role="menu"
          className="cut-sm absolute right-0 top-full z-20 mt-1 min-w-40 border border-border-bright bg-bg-elevated py-1"
        >
          {isOwn ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setPending("delete");
              }}
              className={`${itemClass} text-val-red hover:text-val-red`}
            >
              <Icon name="Trash" size={16} />
              {kind === "post" ? t("deletePost") : t("deleteComment")}
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                disabled={reported}
                onClick={handleReport}
                className={itemClass}
              >
                <Icon name="Flag" size={16} />
                {reported
                  ? t("alreadyReported")
                  : kind === "post"
                    ? t("reportPost")
                    : t("reportComment")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setPending("block");
                }}
                className={itemClass}
              >
                <Icon name="Prohibit" size={16} />
                {t("blockUser")}
              </button>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pending === "delete"}
        title={
          kind === "post"
            ? tActions("deleteTitle")
            : tActions("deleteCommentTitle")
        }
        description={tActions("deleteDescription")}
        cancelLabel={tActions("deleteCancel")}
        confirmLabel={tActions("deleteConfirm")}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void handleDelete()}
      />
      <ConfirmDialog
        open={pending === "block"}
        title={tActions("blockTitle")}
        description={tActions("blockDescription")}
        cancelLabel={tActions("deleteCancel")}
        confirmLabel={tActions("blockConfirm")}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void handleBlock()}
      />
    </div>
  );
}
