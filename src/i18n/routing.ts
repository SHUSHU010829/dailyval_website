import { defineRouting } from "next-intl/routing";

// 路由設定的唯一來源，同時供 middleware 與 navigation 共用
export const routing = defineRouting({
  locales: ["zh-TW", "en"],
  defaultLocale: "zh-TW",
});
