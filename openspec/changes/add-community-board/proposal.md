## Why

官網的「社群」目前以 `COMMUNITY_URL`（`https://social.dailyval.com`）外連到獨立專案 `dailyval_social`，使用者離開官網、導覽列與登入狀態中斷，且需要維護兩套 Next.js 專案。兩邊其實連同一個 Supabase 專案（`social` schema）與同一套 Apple 登入，因此可以把社群板直接併入官網，成為 `/[locale]/community` 內頁。

## What Changes

- 以 `dailyval_social` 的 `origin/feat/supabase-social` 分支為來源，將貼文板（動態牆、貼文詳情與留言、作者頁、發文、留言、按讚、檢舉、封鎖、刪除）搬進官網。
- 新增路由 `/[locale]/community`、`/[locale]/community/post/[id]`、`/[locale]/community/user/[id]`。
- 資料層放在 `src/lib/community/`，共用官網既有的 Supabase client（`.schema("social")`）與 Apple 登入，不另建 client。
- UI 依官網風格重寫：移除 shadcn/Radix、lucide、zustand、swr、motion、sonner、vaul，改用 Phosphor（`Icon`）、官網 token 與 `HudModal`。
- 新增 `communityBoard` i18n namespace 與 `meta.community*`；新增 `/og/community-post` OG 圖、sitemap 貼文與使用者網址。
- 導覽列、頁尾、首頁 `CommunitySection` 的「社群」連結改為站內連結，移除 `COMMUNITY_URL`。
- `apple-app-site-association` 預設排除 `/community` 路徑，避免 iOS 直接開 App。

## Non-Goals

- 不處理 `social.dailyval.com` 舊網域（不轉址、不設 canonical）。
- 不搬 AdSense 廣告位與獨立 GA。
- 不把首頁 `CommunitySection` 的預覽貼文改接真實資料。
- 不修改 Supabase schema、RPC 或 edge function（屬後端 repo）。
- 不新增任何 npm 套件。

## Capabilities

### New Capabilities

- `community-board`: 官網內的社群貼文板，涵蓋動態牆、貼文詳情與留言、作者頁、發文與互動，以及與官網共用的登入狀態。

### Modified Capabilities

- `site-navigation`: 「社群」連結由外部網址改為站內 `/[locale]/community`。
- `seo-metadata`: sitemap 納入社群頁面，新增社群貼文 OG 圖與 metadata。
- `universal-links`: AASA 排除 `/community` 路徑。

## Impact

- Affected specs: `community-board`（新增）、`site-navigation`、`seo-metadata`、`universal-links`
- Affected code:
  - 新增：`src/lib/community/*`、`src/components/community/*`、`src/app/[locale]/community/**`、`src/app/og/community-post/route.tsx`
  - 修改：`src/components/SiteNav.tsx`、`src/components/SiteFooter.tsx`、`src/components/sections/CommunitySection.tsx`、`src/lib/site-config.ts`、`src/components/Icon.tsx`、`src/app/sitemap.ts`、`messages/en.json`、`messages/zh-TW.json`、`public/.well-known/apple-app-site-association`、`.env.example`
- 外部相依（需後端確認）：`media-upload` edge function 與 R2 presigned PUT 的 CORS 需允許 `https://dailyval.com`。
