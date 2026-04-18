"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const APP_STORE_URL = "https://apps.apple.com/tw/app/dailyval/id1637782901";

export default function MobileDownloadBar() {
  const t = useTranslations("nav");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      // 捲過 400px 後出現
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "border-t border-val-red/40 bg-bg-base/90 backdrop-blur-lg px-4 py-3",
        "transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      aria-hidden={!visible}
    >
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? 0 : -1}
        className="cut flex items-center justify-center gap-2 bg-val-red py-3 font-ui text-sm font-bold uppercase tracking-widest text-white transition-all active:brightness-90"
      >
        {t("download")}
      </a>
    </div>
  );
}
