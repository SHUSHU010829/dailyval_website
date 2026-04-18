"use client";

import { QRCodeSVG } from "qrcode.react";

const APP_STORE_URL = "https://apps.apple.com/tw/app/dailyval/id1637782901";

/**
 * App Store QR Code — 桌面版（md:）顯示，手機版隱藏
 */
export default function AppStoreQRCode() {
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
        掃碼下載
      </p>
    </div>
  );
}
