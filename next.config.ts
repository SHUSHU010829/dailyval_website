import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Apple App Site Association 需要 application/json Content-Type
  // 否則 iOS 不認識 AASA 檔案
  async headers() {
    // 後台是一堆一鍵就生效的破壞性動作（下架、刪除、封禁、通過藍勾勾）。
    // 沒有 frame-ancestors 的話，一個已登入的管理員可以被誘導在別人的
    // iframe 裡按下它們——noindex 擋不住這件事，它只管搜尋引擎。
    // frame-ancestors 是現行標準；X-Frame-Options 留給不吃 CSP 的舊瀏覽器。
    const noFraming = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
      { source: "/admin", headers: noFraming },
      { source: "/admin/:path*", headers: noFraming },
      // route 本身也要標:它們才是真正做事的那一端。
      { source: "/api/admin/:path*", headers: noFraming },
    ];
  },
};

export default withNextIntl(nextConfig);
