## Context

官網（Next.js 16 / React 19 / next-intl / Tailwind v4）的「社群」目前外連 `https://social.dailyval.com`。來源專案 `dailyval_social` 的 `origin/feat/supabase-social` 分支已把貼文板從 CloudKit 改為 Supabase（`social` schema 的 RPC），與官網使用同一個 Supabase 專案與同一套 Apple 登入（`NEXT_PUBLIC_APPLE_SERVICES_ID`、redirect `/auth/apple`）。官網已有共用 client（`src/lib/esports/supabase-client.ts`）、`EsportsAuthProvider`、`HudModal`、`Icon`（Phosphor）與 `.schema("skins")` 的先例（`src/lib/ratings/skin-service.ts`）。

## Goals / Non-Goals

**Goals:**

- 把社群板完整搬進 `/[locale]/community`，登入狀態與 esports/skins 共用。
- UI 使用官網元件與 token，不引入新套件。
- 保留來源分支 review 第 1–5 輪修正的行為（fail-closed、冪等發文、反應排序）。

**Non-Goals:**

- 不改 Supabase schema / RPC / edge function。
- 不處理舊網域、廣告位、獨立 GA。

## Decisions

### 共用 Supabase client 與 Apple 登入

資料層用 `getSupabase().schema("social")`，不另建 `createClient`，避免兩個 GoTrueClient 搶同一把 localStorage key。登入由 `useEsportsSession()` 提供，`CommunitySessionProvider` 只額外載入 `social.author_profile` 與 `canPost`。替代方案（獨立 client）被否決，因為會造成 session 不同步。

### 資料層搬到 src/lib/community

`types`、`mapping`、`thread`、`reaction-queue`、`image-compress`、`errors`、`reads` 原樣搬；`service`、`media-upload` 改用共用 client；伺服端讀取沿用 `Content-Profile: social` 的 raw fetch（與 `src/lib/esports/server-reads.ts` 同風格）。

### 以純 reducer 取代 SWR 與 zustand

`feed-state.ts` 為純函式 reducer，`useCommunityFeed` 負責 effect 與快取。必須保留：uid 變更重抓、登入者讀取失敗時 fail-closed、匿名快取不得複製進登入快取、返回時保留已載入頁面（module-level Map 加 sessionStorage）。替代方案（保留 SWR）被否決，因為官網不使用 SWR，且需求是改寫為官網風格。

### 以 HudModal 與自建提示取代 Radix、sonner、vaul

所有對話框、lightbox、確認步驟使用 `HudModal`；提示使用約 40 行的 `CommunityNoticeProvider`（`aria-live="polite"`）；選單使用小型 popover。

### i18n 使用 communityBoard namespace

新增 `communityBoard` 與 `meta.community*`，不動既有 `community`（首頁區塊）與 `nav.community`。以 vitest 檢查兩語系 key 一致。

### OG、sitemap 與 AASA 整合

`/og/community-post` 只接受 `id` 與 `locale`，伺服端自行抓取貼文，圖片 host 須在白名單。sitemap 改為 async 並設 `revalidate = 3600`，Supabase 失敗時回傳空陣列。AASA 比照 ratings 排除 `/community` 路徑。

### 站內連結取代 COMMUNITY_URL

SiteNav、SiteFooter、CommunitySection 改為站內連結，確認無其他使用後刪除 `COMMUNITY_URL`。

## Risks / Trade-offs

- [上傳 CORS 只允許 social.dailyval.com] → 實作前與後端確認 `media-upload` 與 R2 CORS 加入 `https://dailyval.com`；未確認前圖片發文可能失敗。
- [改寫時遺失 review 修正的邊界行為] → 先移植並通過 reducer 與 hook 測試（測試先行）。
- [貼文同時出現在兩個網域造成重複內容] → 本次不處理，後續可在舊站設 canonical。
- [共用登入使 header 顯示 esports 名稱而非 Riot 名稱] → 接受，社群內以 `author_profile` 顯示作者。
- [Next 16 / React 19 差異（params 為 Promise、render 中 setState）] → 每頁呼叫 `setRequestLocale`，完成後以 react-doctor 檢查。
