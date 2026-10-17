"use client";

import Portal from "@/components/community/Portal";
import HudModal from "@/components/esports/HudModal";

// 危險動作（刪除、封鎖）的確認步驟，建立在官網的 HudModal 上。

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel(): void;
  onConfirm(): void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <HudModal open={open} onClose={onCancel} title={title}>
        <p className="font-body text-sm text-text-2">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cut-sm border border-border-med px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:text-text-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="cut-sm bg-val-red px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </HudModal>
    </Portal>
  );
}
