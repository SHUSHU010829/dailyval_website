## 1. 前置確認

- [ ] 1.1 與後端確認 `social` schema 的 RPC（feed、post_detail、post_comments、author_profile、author_posts、create_post、delete_post、create_comment、delete_comment、set_post_reaction、set_comment_reaction、report_content、block_author）已在正式環境，且 `media-upload` edge function 與 R2 的 CORS 允許 `https://dailyval.com`
- [ ] 1.2 確認 Apple Services ID 的 return URL `https://dailyval.com/auth/apple` 已登記（esports 已使用）

## 2. 資料層搬到 src/lib/community

- [x] 2.1 從 `origin/feat/supabase-social` 移植 `types.ts`、`mapping.ts`、`thread.ts`、`reaction-queue.ts`、`image-compress.ts`、`errors.ts` 到 `src/lib/community/`，並移植對應測試為 vitest
- [x] 2.2 建立 `constants.ts`，Supabase URL/key 取自 `@/lib/esports/constants`，保留 `MEDIA_BASE_URL` 與 `envOr`，並在 `.env.example` 加入選填的 `NEXT_PUBLIC_MEDIA_BASE_URL`
- [x] 2.3 移植 `reads.ts`（raw fetch 加 `Content-Profile: social`）及測試
- [x] 2.4 移植 `service.ts` 與 `media-upload.ts`，共用 Supabase client 與 Apple 登入：改用 `getSupabase().schema("social")`，刪除 auth 相關函式，並移植測試（mock `@/lib/esports/supabase-client`）
- [x] 2.5 建立 `time.ts`（`formatRelativeTime`）、`rank.ts`、`share.ts`（回傳 `shared | copied | failed`）

## 3. Session 與狀態（測試先行）

- [x] 3.1 以純 reducer 取代 SWR 與 zustand：實作 `feed-state.ts`，並先寫測試涵蓋：uid 變更重抓、fail-closed、匿名快取不複製進登入快取、addPost/removePost
- [x] 3.2 實作 `CommunitySessionProvider`（巢狀於 `EsportsAuthProvider`，只載入 `author_profile` 與 `canPost`）
- [x] 3.3 以 HudModal 與自建提示取代 Radix、sonner、vaul：實作 `CommunityNoticeProvider`（`aria-live="polite"`），對話框與 lightbox 一律用 `HudModal`
- [x] 3.4 實作 `useCommunityFeed`（module-level Map 加 sessionStorage 保留已載入頁面）、`useReaction`（Reactions are ordered per target）、`useCreatePost`（Idempotent post creation with images，保留 `target_exists` 恢復）、`useErrorMessage`，並移植測試

## 4. i18n

- [x] 4.1 i18n 使用 communityBoard namespace：在 `messages/zh-TW.json` 與 `messages/en.json` 新增 `communityBoard` namespace 與 `meta.community`、`meta.communityPost`、`meta.communityUser`，不動既有 `community` 與 `nav.community`
- [x] 4.2 新增 vitest 測試驗證 Localized community copy：兩語系 `communityBoard` key 一致

## 5. 唯讀 UI 與路由

- [x] 5.1 在 `src/components/Icon.tsx` 的 `ICON_MAP` 補上所需 Phosphor icon（ThumbsUp、ThumbsDown、DotsThree、Flag、Prohibit、Trash、ImageSquare、X、ShareNetwork、LinkSimple、ArrowLeft、ArrowsClockwise，名稱先對照 Phosphor 實際 export）
- [x] 5.2 實作 `AuthorBadge`、`TextWithTags`、`PostImages`（grid 與 lightbox）、`PostCard`、`PostSkeleton`
- [x] 5.3 實作 `CommunityFeed`（Feed pagination and viewer-aware loading：IntersectionObserver 加「載入更多」按鈕）
- [x] 5.4 建立 Community board routes：`src/app/[locale]/community/layout.tsx`（EsportsAuthProvider > CommunitySessionProvider > CommunityNoticeProvider，加 header 與 `AccountControls`）、`page.tsx`（`revalidate = 30`）、`post/[id]/page.tsx` 與 `error.tsx`、`user/[id]/page.tsx`；採 Next 16 的 Promise `params`、`setRequestLocale`、非 UUID 呼叫 `notFound()`
- [x] 5.5 實作 `PostDetail`、`CommentThread`、`CommentRow`、`AuthorPage`

## 6. 寫入 UI

- [x] 6.1 實作 `PostComposer`（桌機 inline、手機 `HudModal`，最多 5 張圖）與 `CommentComposer`
- [x] 6.2 實作 `LinkRiotIdDialog`（Posting requires a linked Riot ID：HudModal 加 `qrcode.react`）與未登入提示
- [x] 6.3 實作 `PostActionsMenu`（Moderation actions：檢舉、封鎖、刪除、複製連結，確認步驟用 `HudModal`）

## 7. SEO、OG、sitemap 與 AASA

- [x] 7.1 三個社群頁面使用 `buildMetadata`，貼文頁設 `article` 類型，找不到時設 `robots: { index: false }`（Community pages expose metadata and a post OG image）
- [x] 7.2 新增 `src/app/og/community-post/route.tsx`（OG、sitemap 與 AASA 整合：只接受 `id` 與 `locale`、伺服端取資料、圖片 host 白名單、無效 id 回傳品牌 fallback）及測試
- [x] 7.3 更新 `src/app/sitemap.ts`：Sitemap enumerates all public routes，加入 `/community`、貼文與使用者網址，改為 async 並設 `revalidate = 3600`，失敗時回傳靜態項目；新增 `src/app/sitemap.test.ts`
- [x] 7.4 在 `public/.well-known/apple-app-site-association` 加入 AASA excludes community paths 的四個排除項（置於 `/*` 之前）

## 8. 站內連結

- [x] 8.1 站內連結取代 COMMUNITY_URL：`SiteNav.tsx` 改為 `/${locale}/community` 且 `external: false`（Desktop navigation links）、`SiteFooter.tsx` 改為 `/community`、`sections/CommunitySection.tsx` 兩處改用 `@/i18n/navigation` 的 `Link` 並更換 icon
- [x] 8.2 grep 確認無其他使用後刪除 `src/lib/site-config.ts` 的 `COMMUNITY_URL`

## 9. 驗證

- [x] 9.1 確認 No new dependencies and shared design system：`package.json` 沒有新增套件
- [x] 9.2 執行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`npm run build`
- [ ] 9.3 手動驗證（Shared authentication with the rest of the site）：未登入看 feed、Apple 登入、無 Riot ID 帳號、發 5 張圖貼文、留言、按讚、檢舉、封鎖、刪除、`/ratings/esports` 與 `/community` 登入狀態共用、返回保留 feed、中英切換
- [x] 9.4 對新元件執行 react-doctor
