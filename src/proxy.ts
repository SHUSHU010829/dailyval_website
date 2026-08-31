import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 proxy 需要用具名函數（非匿名 default export）
// 直接傳遞 NextRequest 給 next-intl 的 middleware handler
const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  // 比對所有路徑，排除 API、後台、Next.js 內部路徑與靜態檔案。
  // /admin 沒有語系（用它的人就一個），沒排除的話會被導去 /zh-TW/admin。
  matcher: "/((?!api|admin|trpc|og|_next|_vercel|.*\\..*).*)",
};
