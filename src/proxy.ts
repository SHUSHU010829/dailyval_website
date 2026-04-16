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
  // 比對所有路徑，排除 API、Next.js 內部路徑與靜態檔案
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
