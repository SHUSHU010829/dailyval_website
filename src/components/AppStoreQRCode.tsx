"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { APP_STORE_URL } from "@/lib/site-config";

/**
 * App Store QR Code — 桌面版（md:）顯示，手機版隱藏
 */
export default function AppStoreQRCode() {
  const t = useTranslations("nav");

  return (
    <div className="hidden flex-col items-center gap-2 md:flex">
      <div className="cut border border-border-med bg-white p-2">
        <QRCodeSVG
          value={APP_STORE_URL}
          size={96}
          bgColor="#ffffff"
          fgColor="#0a0a0f"
          level="M"
        />
      </div>
      <p className="font-ui text-[10px] uppercase tracking-widest text-text-3">
        {t("scanToDownload")}
      </p>
    </div>
  );
}
