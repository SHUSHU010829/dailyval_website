"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import Portal from "@/components/community/Portal";
import HudModal from "@/components/esports/HudModal";
import { APP_STORE_URL } from "@/lib/site-config";

// 發文／留言需要先在 App 綁定 Riot ID：說明步驟，附 App Store QR code 與連結。

export default function LinkRiotIdDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}) {
  const t = useTranslations("communityBoard.riotIdCheck");

  return (
    <Portal>
      <HudModal open={open} onClose={onClose} title={t("title")}>
        <p className="font-body text-sm leading-relaxed text-text-2">
          {t("description")}
        </p>

        <ol className="my-4 space-y-3">
          {(["step1", "step2", "step3"] as const).map((key, index) => (
            <li key={key} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center bg-val-red font-ui text-xs font-bold text-bg-base">
                {index + 1}
              </span>
              <span className="font-body text-sm text-text-1">{t(key)}</span>
            </li>
          ))}
        </ol>

        <p className="text-center font-ui text-xs text-text-3">
          {t("iosOnly")}
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="cut-sm shrink-0 border border-border-med bg-white p-2">
            <QRCodeSVG
              value={APP_STORE_URL}
              size={88}
              bgColor="#ffffff"
              fgColor="#0a0a0f"
              level="M"
              role="img"
              aria-label={t("qrCodeHint")}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="font-ui text-[11px] uppercase tracking-widest text-text-3">
              {t("qrCodeHint")}
            </p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cut-sm border border-border-bright bg-bg-elevated px-4 py-2 text-center font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
            >
              {t("downloadApp")}
            </a>
          </div>
        </div>
      </HudModal>
    </Portal>
  );
}
