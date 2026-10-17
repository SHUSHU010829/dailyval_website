import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

// social.dailyval.com 是退場的社群站（原本在 Zeabur）。網域改掛到這個專案後，
// 它的網址全部 308 到 /community：貼文與作者頁的 uuid 兩邊相同（2026-10-17
// 拿舊站 sitemap 抽樣驗證過），首頁交給官網自己挑語系。已分享出去的連結和
// 舊版 App 產生的分享連結只有貼文、作者、首頁這三種形狀。
const socialHost = [{ type: "host" as const, value: "social.dailyval.com" }];

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // 必須在 public 檔案前改寫，且不能 redirect：Apple 直接讀取此路徑。
      beforeFiles: [
        {
          source: "/.well-known/apple-app-site-association",
          has: [{ type: "host", value: "rooms.dailyval.com" }],
          destination: "/.well-known/rooms-apple-app-site-association.json",
        },
        // 舊社群站的 AASA 繼續供應：已分享出去的 social.dailyval.com 貼文連結
        // 才會照舊直接開 App，而不是先開瀏覽器再被轉址。
        {
          source: "/.well-known/apple-app-site-association",
          has: socialHost,
          destination: "/.well-known/social-apple-app-site-association.json",
        },
      ],
    };
  },
  // rooms.dailyval.com 本身是分享網域，只有 /room/{id}；根目錄帶去揪團列表，
  // 讓人記一個短網址就找得到所有房間。AASA 在這個網域只認 /room/*，根目錄不會被 App 攔走。
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "rooms.dailyval.com" }],
        destination: `${baseURL}/rooms`,
        permanent: false,
      },
      // social.dailyval.com：先比對貼文與作者頁，再是語系首頁，最後其他路徑
      // 一律帶去動態牆。順序就是優先順序，第一條符合的生效。
      {
        source: "/:locale(zh-TW|en)/post/:id",
        has: socialHost,
        destination: `${baseURL}/:locale/community/post/:id`,
        permanent: true,
      },
      {
        source: "/:locale(zh-TW|en)/user/:id",
        has: socialHost,
        destination: `${baseURL}/:locale/community/user/:id`,
        permanent: true,
      },
      {
        source: "/:locale(zh-TW|en)",
        has: socialHost,
        destination: `${baseURL}/:locale/community`,
        permanent: true,
      },
      {
        source: "/",
        has: socialHost,
        destination: `${baseURL}/community`,
        permanent: true,
      },
      // 其餘（舊 sitemap、robots、riot.txt、api…）也帶去動態牆。.well-known 除外：
      // redirect 跑在 beforeFiles rewrite 之前，攔了它上面的 AASA 就出不去。
      {
        source: "/:path((?!\\.well-known/).*)",
        has: socialHost,
        destination: `${baseURL}/community`,
        permanent: true,
      },
    ];
  },
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
      { source: "/writer", headers: noFraming },
      { source: "/writer/:path*", headers: noFraming },
      { source: "/api/writer/:path*", headers: noFraming },
    ];
  },
};

export default withNextIntl(nextConfig);
