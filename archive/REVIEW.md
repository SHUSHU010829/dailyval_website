# DailyVal 網站審查報告（官網 + 社群版）

> 審查日期：2026-07-27
> 範圍：`dailyval_website`（官網，Next.js 16 / Tailwind v4）與 `dailyval_social`（社群版，Next.js 14 / shadcn/ui / CloudKit）
> 兩專案皆已驗證 `tsc --noEmit` 與 `next build` 通過。

---

## 執行狀態（2026-07-28 更新）

官網（`dailyval_website`）章節的高優先（🔴 9 項）與中優先（🟡 10 項）共 19 項已透過 Spectra 拆成三個變更實作並歸檔：

- [`2026-07-28-seo-metadata-cleanup`](../openspec/changes/archive/2026-07-28-seo-metadata-cleanup/)：OG 圖片、sitemap/robots/結構化資料、`/og/square` 死碼、`generateMetadata` 死碼
- [`2026-07-28-accessibility-i18n-fixes`](../openspec/changes/archive/2026-07-28-accessibility-i18n-fixes/)：游標、對比度、法律頁/支援頁 i18n、無障礙、`/creators` 表單控制項樣式
- [`2026-07-28-code-health-cleanup`](../openspec/changes/archive/2026-07-28-code-health-cleanup/)：Icon tree-shake、未使用依賴、lockfile、README、死元件、常數集中、AdSense 同意機制、typecheck/CI/測試基礎設施

**未處理（保留給未來變更）**：🟢 低優先 8 項、「三、兩邊風格對應」章節（需要 `dailyval_social` 專案）、`dailyval_social`（社群版）全部項目（不在此 repo 內）。

本檔案為歷史審查記錄，移至 `archive/` 保存；後續實作細節請見上方連結的已歸檔變更。

---

## 總覽

| 項目 | 官網 | 社群版 |
|------|------|--------|
| 編譯 / 型別 | ✅ 通過 | ✅ 通過 |
| 最大風險 | 無障礙（游標消失、對比度）＋ SEO 基礎缺失 | **API 安全漏洞（未驗證的寫入代理）** |
| 設計 token | HUD 色系單一來源 | 已沿用官網同一套 token ✅ |
| 主要債務 | 4 個未使用依賴、README 全是模板 | 大量死程式碼、測試造假、四套 lint 設定 |

---

## 一、官網 `dailyval_website`

### 🔴 高優先

1. **減少動態偏好使用者會完全沒有游標**
   `globals.css` 對所有元素設 `cursor: none !important`，但 `TacticalCursor.tsx:20` 在 `prefers-reduced-motion: reduce` 時直接 return 不渲染自訂游標 → 這類使用者（以及 JS 尚未載入時）整站看不到游標。
   建議：`cursor: none` 包在 `@media (prefers-reduced-motion: no-preference) and (pointer: fine)` 內。

2. **Phosphor Icons 整包無法 tree-shake**
   `Icon.tsx:3` 用 `import * as PhosphorIcons` + 動態索引，bundler 無法搖掉未使用的 ~1300 個 icon（套件 CSR 目錄約 17MB）。實際只用約 15 個 → 改成明確的靜態 icon 對照表或逐一 deep import。且 `Icon.tsx` 是 client component，被 4 個 Server Component 引用，把 client boundary 拖進每一頁。

3. **1.66MB 的 appicon.png 被 base64 塞進 edge function**
   `og/route.tsx:35-45` 讀取 2648×2648 的 `public/appicon.png` 轉 base64（~2.2MB data URL）。Vercel Edge Function 有 1MB（Hobby）/4MB（Pro）上限，有部署失敗風險。請預先縮圖（OG 內顯示尺寸很小）。

4. **SEO 基礎缺失**：無 `sitemap.ts`、無 `robots.ts`、無 `metadataBase`、無結構化資料（可加 `SoftwareApplication`＋`aggregateRating`、`FAQPage`）。首頁 title 只有 `DailyVal`，無任何關鍵字。

5. **WCAG 對比度不合格**
   - `--text-3`（30% 透明白）疊在 `#0a0a0f` 上約 **2.3:1**（標準 4.5:1），卻用於 footer、統計標籤、法律頁等大量實際內容。
   - 白字配 `val-red #ff4655` 約 **3.35:1**，所有主要 CTA 都中招。可將紅色加深或改用 `text-bg-base`（綠/藍 badge 已是這樣做的）。

6. **法律頁與支援頁完全繞過 i18n**
   `tos`、`privacy` 內文是純英文 literal；`support/page.tsx:30-127` 是 100 行的 `isZh ? (...) : (...)` 三元式。zh-TW 使用者看 `/zh-TW/tos` 得到整頁英文。另外 `AppStoreQRCode.tsx:23`（掃碼下載）、`CommunitySection.tsx` 的預覽貼文與「查看更多 →」都是寫死中文，會出現在 `/en`。

7. **4 個完全未使用的依賴**：`gsap`、`framer-motion`、`@mdx-js/react`、`@next/mdx`（全 repo 0 個 import），連同 `next.config.ts` 的 MDX 設定一起移除。

8. **lockfile 被 gitignore**（`.gitignore` 最後三行）→ 建置不可重現，建議把 `package-lock.json` 加回版控。

9. **README 仍是 create-next-app 模板**（描述的字型、路徑都是錯的），且無 `.env.example`（`NEXT_PUBLIC_BASE_URL`、`NEXT_PUBLIC_CREATOR_FORM_ENDPOINT` 皆未文件化——最近一次 commit 就是因 env var 問題觸發重建）。

### 🟡 中優先

10. **`/og/square` 整條路由是死碼**：`seo.ts:38-41` 算出 `resolvedTwitterImage` 但 82 行傳的是 `resolvedOgImage`，Twitter 卡永遠用橫圖，523 行的方形 OG route 無法被觸達。
11. **OG 圖不吃 `title` 參數**：`og/route.tsx` 解析了 title 卻從未渲染 → 五頁 OG 卡幾乎一樣。且 OG 圖寫死「900K+ 活躍玩家」，與站上文案「1.2M」互相矛盾。
12. **`TestimonialsSection` 是死元件**，還引用不存在的 `bg-bg-surface` token；對應的 `testimonials` 翻譯 namespace 也是死的。
13. **`[locale]/layout.tsx:19-36` 的 `generateMetadata` 無效**：每頁的 `buildMetadata` 都會覆蓋 `alternates`，此段重複且永不生效。
14. **`WebVitalsReporter` 上線後仍在每頁 console.log**（元件註解自己說「上線前可直接刪除」）。
15. **常數重複散落**：App Store URL 寫死在 6 處、社群網址 3 處＋翻譯檔、客服信箱 ~10 處 → 建議建立 `src/lib/config.ts` 統一。
16. **`t.raw()` 無防護轉型**（creators 頁 6 處、FeaturesSection、表單）——translation key 缺漏會直接 crash render。
17. **無障礙**：無 skip-to-content 連結；表單錯誤/成功狀態無 `role="alert"`/`aria-live`；語言與平台 chips（`role="checkbox"`）缺 `focus-visible` 樣式；行動下載列 `fixed bottom-0` 蓋住頁尾內容（main 需補 padding）。
18. **AdSense 每頁載入**（含法律頁），無同意機制，且站根目錄沒有 web 用的 `ads.txt`（只有 app-ads.txt）。
19. **無 `typecheck`/`test` script、無測試、無 CI**。

### 🟢 低優先

- `TacticalCursor`：stale closure 導致每次 mousemove 都 dispatch setState；用 `style.left/top` 而非 `transform` 定位（主執行緒 layout）。
- `SiteNav`、`MobileDownloadBar` 的 scroll listener 未節流（可改 IntersectionObserver sentinel）。
- `globals.css` 內 `glitch-before/after` keyframes 與 `.glitch` 定義各出現兩次（早的那組是死碼）、276-278 行是空的 media query。
- `HeroCtaButton` 為了一個 hover boolean 變成 client component（可用 `group-hover:` 歸零 JS）；內部 8 處寫死 `#ff4655` 不走 token。
- 死翻譯 key：`common`、`pages`、`testimonials`、`nav.about/faq/switchLocale`（且 en.json 的 `nav.switchLocale` 值是中文）。
- `LocaleSwitcher` 用字串 replace 換 locale、手寫 cookie，建議改用 next-intl 的 `createNavigation(routing)`。
- App Store 連結全部指向 `/tw/` storefront，含英文站。
- footer 版權年份在 build time 凍結。
- openspec 規格檔 Purpose 全是 `TBD`，`@trace` 引用已刪除的檔案；spec 要求的 reduced-motion 行為（countUp 等需停用）與實作不符，`useReducedMotion` hook 沒有任何消費者。

---

## 二、社群版 `dailyval_social`

### 🔴 安全性（最優先，建議立即處理）

1. **`/api/cloudkit-proxy` 是無驗證的完整資料庫寫入代理**
   接受任意 `{operation, params}`，用伺服器 API token 轉發 CloudKit：任何人可對 public DB 的**任何 recordType 做建立/覆寫/刪除/列舉**。此路由前端根本沒在用 → **直接刪除**（`/api/update` 同理，是重複的按讚端點）。

2. **`/api/post-actions` 刪文不驗證擁有權**：`handleDeletePost` 收了 `userId` 但完全沒用它比對，任何人可刪任何貼文。按讚寫入的 `userId` 也是呼叫端自報，票數可灌。`handleBlockUser` 可改別人的 Users record。
   **根本原因：整個 app 沒有伺服器端 session**，身分完全信任 localStorage 傳來的 `userRecordName`。需改為伺服器端驗證 CloudKit web auth token。

3. **OG 圖路由是 SSRF / 開放圖片代理**：`/api/og-image?postImage=<任意URL>` 直接在 edge 上抓取渲染，無 host 白名單。

4. **CORS 全開**：`next.config.mjs:49-53` 對 `/api/(.*)` 設 `Access-Control-Allow-Origin: *`（還配了 `Allow-Credentials: true`），上述未驗證端點可被任何網站跨域呼叫。

5. **機密塞進 `next.config.mjs` 的 `env` 區塊**：`APPLE_CK_API_TOKEN`、`APPLE_PRIVATE_KEY` 等走 build-time inlining，目前尚未洩漏，但任何 client 檔案一 import `lib/env` 就會把 Apple 私鑰打包進瀏覽器。Dockerfile 也把 token 以 ARG→ENV 存進 image layer。

6. 其他：全站 12 條 API 路由**零 rate limiting**（`/api/user-data` 的 fallback 會撈整張 Users 表）；`utils/user-data.ts` 用寫死字串 `'DailyVal'` 做 XOR「加密」riotID（僅是混淆）；錯誤回應原樣轉發 CloudKit 上游細節；CSP 含 `unsafe-inline unsafe-eval` 形同虛設。

### 🟠 程式碼品質

7. **render 期間 setState**：`cloudkit-authentication.tsx:548-550` 在 render body 呼叫 `setIsAuthLoading(false)`，且比對用的 ref 從未被賦值，條件恆真。
8. **i18n key 錯誤（可見 bug）**：`post.tsx:105,133` 的 `t('post.loginFirst')` 在已 scope 到 `post` namespace 下解析成 `post.post.loginFirst`（不存在）→ 未登入按讚會看到原始 key 字串。
9. **`Math.random()` 在 render 中**（`smooth-post-skeleton.tsx`、`post-client.tsx:893` 決定是否放廣告）→ hydration mismatch。
10. **三套 load-more 實作，兩套是死碼**（`load-more-trigger`、`enhanced-load-more-trigger` 0 個 import）。存活的 `simple-load-more-trigger` 有計時器與 SWR 狀態脫鉤的重複觸發窗口；`use-infinite-posts.ts` 的 module-level AbortController Map 會讓同 key 的兩個元件互相取消請求，被取消方回傳 `hasMore:false` 且被 SWR 快取 → **分頁可能永久終止**。
11. **死碼清單約 25+ 檔案**：`authentication.tsx`、`cloudkit-script.tsx`、`server/static-post.tsx`、7 個動畫 icon、4 個 hooks（其中 `useAuthStatus` 呼叫不存在的 `/api/auth/status`）、3 個重複的時間格式化模組、`data/*.json` fixtures、`lib/server-actions.ts`（全是回傳成功的 TODO stub）、無人呼叫的 `/api/comment`、`/api/update`、`/api/contact`（後者回傳成功但什麼都沒做）。
12. **狀態管理繞過了已裝的 zustand**：登入使用者資料寫進隱藏 DOM 節點 `#cloudkit-user-data` 再 parse 回來，跨元件溝通靠 7 種 window CustomEvent + localStorage。`useThemeStore` 的 setter 是空函式、`useUserStore` 0 個消費者。建議收斂成一個 `useAuthStore`。
13. 其他：貼文詳情頁留言**一則一個 HTTP request**（50 則留言 = 50 個 round-trip）；詳情頁寫入直接呼叫 `window.CloudKit`（與 feed 走完全不同路徑）；`user-client.tsx` 的個人頁 header 從 `posts[0]` 重建（零貼文的使用者沒有 header）、刪文後 `handleRefresh` 是 no-op；`transition-context` 對每次點貼文硬加 300ms 延遲，且 `currentPost` 從未被讀取。

### 🟡 效能

14. **`framer-motion` 與 `motion` 同時在依賴中**，前者 0 個 import；`motion` 的 8 個消費者裡只有 2 個 icon 實際被用。**`cobe`、`react-intersection-observer`、`tailwindcss-animate` 也都是 0 import**。
15. **整個 feed 純 client render**：首頁 `'use client'`，爬蟲與首繪只看到空殼＋骨架屏（SEO 大傷）。已有 `lib/server-post.ts` 可查貼文，建議至少首屏 SSR。
16. **`providers.tsx` 在瀏覽器動態 import 語系 JSON，載入前回傳 `null`** → 每頁首繪先白屏，SSR 被整個抵銷。
17. **root layout 的 `useSearchParams` 無 Suspense 邊界**（AnalyticsProvider）→ Next 14 下所有路由被迫 dynamic。
18. API 路由零快取（無 revalidate / Cache-Control），SWR 又關掉所有 revalidation → 資料「永遠舊直到手動刷新」，這也是發文後需要 3 次 setTimeout 重試 hack 的原因。
19. 影像：`cloudkit-image.tsx` 正確地繞過 `/_next/image`（簽名 URL 會輪替），但頭像等其他地方仍用 `next/image` 打同樣會輪替的 URL，快取永遠 miss。
20. 每張貼文卡片各自跑 `use-user-data` 的 1 秒輪詢（20 篇 = 20 個 interval）；`use-cloudkit-auth` 每 30 秒打一次網路請求驗證。

### 🟡 SEO / i18n

21. **sitemap 只有 2 條 URL**（`/en`、`/zh-TW`），沒有任何貼文/使用者頁——對社群站是最大 SEO 缺口。`robots.ts` 還 disallow 所有 query string 與已不存在的路由。
22. 使用者頁 `noindex` 且 metadata 是 CloudKit record name；貼文頁 `publishedTime` 永遠是「現在」；`public/og-image.png` 被 layout 引用但**檔案不存在**。
23. 翻譯檔雙語 178 keys 完全同步 ✅，但硬編碼中文散落各處：error boundary 整頁、`post-skeleton` 的「返回首頁」、OG 圖描述、`timeUtils.ts` 的相對時間（**英文使用者看到「X 分鐘前」**，還鎖死 Asia/Taipei 時區）→ 改用 `Intl.RelativeTimeFormat`。
24. `not-found.tsx` / `error.tsx` 用 `bg-gray-100 text-gray-800`——深色站中突兀的白色頁面。

### 🟠 測試與專案衛生

25. **E2E 測試設定指向不存在的目錄**：`playwright.config.ts` 的 `./tests` 與 cucumber 的 `features/` 都不存在，6 個 npm script 無法運作，`TEST_GUIDE.md` 描述的整套基礎設施（多瀏覽器、自動截圖、標籤、報告）**全部是虛構的**。
26. **Jest 94 個測試幾乎無效**：`main-content.test.tsx` 根本沒 import 該元件（在測 `2+2===4`）；有測試的模組全是死碼（theme-toggle、contact、formatTime）；12 條 API 路由與所有核心元件 0 測試；覆蓋率門檻全設 0（實際 3.11%）。
27. **設定檔互相衝突**：`jest.setup.js`（有 mock）沒被載入、載入的是 2 行的 simple 版；`.eslintrc.json` 與 `eslint.config.js` 並存且規則矛盾，`"lint"` script 用了 ESLint 9 已移除的 `--ext`；npm/bun 雙軌（CI 用 npm、Dockerfile 用 bun、bun.lock 被 gitignore）。CI 的 typecheck 用 `|| echo` 吞掉所有錯誤，且 `if: always()` 無條件在 PR 留言「測試已通過」。
28. README 多處與實況不符（宣稱 Framer Motion 驅動、深淺色切換、CSRF 保護、Server Components——皆非事實）。

---

## 三、兩邊風格對應（以官網為主）

### 已一致的部分 ✅

- **色彩 token 完全同源**：兩邊的 `--color-bg-*`、`--color-val-red`、`--color-jett-blue` 等 16 個 HUD token 數值完全相同，社群版還把 shadcn 語意色正確映射回 HUD token。
- **字型三件套一致**：Orbitron（display）/ Rajdhani（ui）/ Noto Sans TC（body），兩邊都走 `next/font`。
- **語系**：都是 en + zh-TW。

### 不一致、建議對齊的部分

| 面向 | 官網 | 社群版 | 建議 |
|------|------|--------|------|
| **形狀語言** | 切角（`.cut` / `.cut-sm` clip-path），全站無圓角 token | 圓角（radius 0.2–0.35rem） | 這是兩站最大的視覺分歧。至少把社群版的**主要 CTA、卡片**改用官網的 `.cut` 切角，或縮小圓角讓銳利感一致 |
| **視覺特效** | glitch、scanlines、glow、circuit-grid、diamond-divider、自訂準星游標 | 全部沒有 | 不必照搬互動特效，但可挑「靜態」元素移植：頁首標題 glitch、區塊 diamond-divider、hover glow，成本低、辨識度高 |
| **字型使用率** | `font-display`/`font-ui` 大量使用（大寫 + tracking-widest 是招牌） | Orbitron 只用 2 處，**Rajdhani 載入了但 0 使用**；Geist Mono 60KB 完全沒用到 | 社群版的區塊標題、按鈕、標籤改套 `font-ui uppercase tracking-widest`；刪除沒用的 Geist 字型檔 |
| **token 使用率** | 元件全面走 token | 約 1/3 的互動色是裸 Tailwind 色（`text-gray-500`、`hover:bg-blue-50`、`text-stone-500`…），404/error 頁還是白底 | 把裸色全面替換為 HUD token（尤其 post.tsx 的按讚/留言 hover 色、404/error 頁） |
| **預設語系** | `zh-TW` | `en` | 統一（建議都 `zh-TW`，與產品主市場一致） |
| **品牌字寫法** | `DailyVal`（元件內）與 `Dailyval` 混用 | `DailyVal` | 統一一種寫法 |
| **主題機制** | 無主題系統（固定深色） | next-themes + `forcedTheme='dark'`，ThemeToggle 被 stub 成 null，`useThemeStore` setter 是空函式 | 社群版既然鎖深色，刪掉 next-themes、theme store、toggle 測試這整條死路 |
| **互相導流** | footer 有連到 social.dailyval.com ✅ | **footer 只有 Riot 免責聲明，沒有回官網、隱私權、服務條款的連結** | 社群版 footer 補上官網/法律頁連結（法律頁可直接連官網的） |
| **OG 視覺** | 深色 HUD 風格 OG 卡 | OG 卡另一套設計、描述寫死中文 | 讓社群版 OG 卡沿用官網的視覺語彙與雙語 |

---

## 四、建議執行順序

1. **（社群版）安全修補**：刪 `cloudkit-proxy` 與 `update` 路由、post-actions 補擁有權驗證、收斂 CORS、og-image 加 host 白名單、機密移出 `env` inlining、加 rate limit。
2. **（官網）無障礙 + SEO**:游標修復、對比度、sitemap/robots/結構化資料。
3. **（兩邊）依賴與死碼大掃除**：官網 4 個、社群版 5 個未使用依賴＋25 個死檔案。
4. **（社群版）正確性小修**：i18n key、render setState、Math.random、時間格式 locale 化。
5. **（兩邊）風格對齊**：上表逐項處理，以官網為基準。
6. **（社群版）測試重建**：刪除虛構的 E2E 設定與 TEST_GUIDE，為 API 路由與核心元件寫真測試。

---

## 附：本分支已完成的修改

- `/creators` 表單樣式同步（本次需求）：
  - 新增 `globals.css` 的 `.select-hud`（自訂箭頭、`color-scheme: dark` 深色原生選單、深色 option）與 `.checkbox-hud`（品牌紅勾選、hover/focus-visible 狀態），取代原生瀏覽器外觀。
  - `CreatorApplicationForm.tsx`：5 個 `<select>` 改用 `selectClass`，同意條款 checkbox 改用 `.checkbox-hud`。
