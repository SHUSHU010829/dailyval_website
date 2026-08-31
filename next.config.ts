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
      // 後台的 API 對非管理員一律回 404 而不是 403，就是為了不昭告這條路徑
      // 存在。而那條路徑上的頁面 <title> 是「後台」，robots.txt 又是
      // Allow: /——爬到就會被收錄，前面那個決定等於白做。
      // 用標頭而不是 robots.txt Disallow：後者會把路徑寫在一個所有人都讀
      // 得到的檔案裡，正好是我們不想做的事。
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
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
