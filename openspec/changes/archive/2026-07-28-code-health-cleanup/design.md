## Context

`project-scaffold` spec 目前要求安裝 `gsap`／`framer-motion`／`@next/mdx`／`@mdx-js/react`，並要求 `next.config.ts` 具備 MDX 支援——這些都是為了「法律頁用 MDX 撰寫」的原始構想預先鋪的路，但實際的 `tos`／`privacy`／`support` 頁面最終改用純 TSX 撰寫（無 `.mdx` 檔案存在），這四個依賴與 MDX 設定變成從未被使用的死重量。

站上目前用 `npm run build`（`next build`）作為唯一的自動化驗證手段，沒有 `tsc --noEmit` 的獨立 typecheck、沒有測試、沒有 CI。AdSense script 目前在 `src/app/layout.tsx`（root layout）用 `next/script` 無條件載入到每一頁。

## Goals / Non-Goals

**Goals:**

- 移除確認無用的依賴、死元件、死翻譯 namespace
- 讓 lockfile、README、`.env.example` 反映專案真實狀態
- 建立最小可用的 typecheck/CI/測試基礎設施
- AdSense 載入前要有明確的使用者同意步驟

**Non-Goals:**

- 不追求全站測試覆蓋率（見 proposal Non-Goals）
- 不實作完整 IAB TCF CMP（見 proposal Non-Goals）

## Decisions

### Icon.tsx 改用明確列舉的靜態 import 對照表

掃描全站（含 `messages/*.json` 內以資料驅動的 `icon` 欄位）後，實際用到的 Phosphor icon 共 23 個：`ArrowSquareOut`、`Backpack`、`ChartBar`、`ChatCircle`、`ChatCircleDots`、`CheckCircle`、`Crown`、`FileText`、`GameController`、`Handshake`、`Heart`、`InstagramLogo`、`Lightning`、`MagnifyingGlass`、`Medal`、`PaperPlaneTilt`、`Plant`、`Star`、`Storefront`、`ThreadsLogo`、`TrendUp`、`UsersThree`、`VideoCamera`。改為 `import { X, Y, Z } from "@phosphor-icons/react"` 明確具名 import，並建立 `Record<PhosphorIconName, ComponentType>` 對照表取代 `import * as PhosphorIcons`。

- **考慮過的替代方案**：改用逐一 deep import（`@phosphor-icons/react/dist/icons/Storefront`）→ Phosphor React 套件的 deep import 路徑不是穩定的公開 API（透過套件 `exports` 設定），具名 import 是官方支援且風險更低的作法

### 移除 MDX 相關依賴與設定，而非保留給未來使用

`project-scaffold` spec 的「MDX support is wired into Next.js config」與「Required runtime dependencies installed」都需要修改。由於全 repo 掃描確認 0 個 `.mdx` 檔案、0 個 `gsap`/`framer-motion` import，且法律頁的實際實作方式（純 TSX）已經穩定運作良好，沒有跡象顯示近期會改用 MDX。保留這些依賴只會持續增加 `node_modules` 大小與潛在的供應鏈攻擊面。

- **考慮過的替代方案**：保留依賴但不用 → 增加安全掃描負擔（每個依賴都是需要追蹤 CVE 的攻擊面）且無實際效益，故不採用

### `pnpm-lock.yaml` 加入版控，其餘 lockfile 繼續忽略

專案實際安裝的是 `pnpm-lock.yaml`（工作目錄已存在此檔案），代表開發者使用 pnpm。只取消忽略這一個 lockfile，`yarn.lock`／`package-lock.json` 繼續留在 `.gitignore` 內，避免未來有人不小心用其他套件管理器安裝而產生多套 lockfile 並存的狀況。

### 常數集中到 `src/lib/site-config.ts`，並移除從未真正在地化的 `community.joinUrl`

`joinUrl` 在 `messages/en.json`／`messages/zh-TW.json` 兩個語系檔裡的值完全相同（`https://social.dailyval.com`），代表它從來不是真正需要在地化的內容，只是恰好走了 i18n 的資料流。改為讓 `CommunitySection.tsx` 直接 import `COMMUNITY_URL` 常數，與 `SiteFooter.tsx`／`SiteNav.tsx` 使用同一來源，避免三個程式碼位置各自維護一份字面值。

- **考慮過的替代方案**：保留 `joinUrl` 翻譯 key、只統一程式碼內的字面值 → 仍然有兩個不同來源（翻譯檔 vs 常數）可能各自被改動而不同步，不如直接收斂成一個來源

### AdSense 同意機制：自建輕量橫幅 + 條件式載入 script，而非串接 Google Funding Choices

`AdConsentGate`（client component）在 `localStorage` 尚無同意紀錄時顯示一個簡短橫幅（同意／拒絕個人化廣告），只有在使用者按下「同意」後才透過 `next/script` 動態掛載 `adsbygoogle.js`。這是純程式碼層面可達成的最小合規行為。

- **考慮過的替代方案**：串接 Google Funding Choices（Google 官方的同意管理平台）→ 需要在 Google AdSense 後台啟用「Privacy & messaging」並完成地區/法規設定，這是帳號層級操作，不是這次程式碼變更能完成的；記錄為已知限制，未來如需完整 CMP 需要另外走 AdSense 後台設定

### 測試框架選用 Vitest + React Testing Library（依 Next.js 官方文件）

依 Next.js 官方文件建議，Next.js App Router 專案的單元測試標準組合是 Vitest + React Testing Library + jsdom，設定檔為 `vitest.config.mts`（`@vitejs/plugin-react` + `vite-tsconfig-paths`）。文件也明確指出 Vitest 目前不支援 `async` Server Component 的單元測試——這也是本次只針對 `safeRaw()`（純函式，非 Server Component）撰寫示範測試、而非嘗試測試頁面元件的原因。

- **考慮過的替代方案**：Jest → Next.js 官方文件同時提供 Jest 與 Vitest 兩種設定指南，但 Vitest 對 Vite/ESM 生態系相容性較好、設定較簡潔，且專案已使用 Tailwind v4（同樣是 Vite 生態系工具鏈的方向），選用 Vitest 與工具鏈方向更一致

## Risks / Trade-offs

- **[Risk]** 移除 4 個依賴若有隱藏的動態 import（如字串拼接的 `import()`）掃描可能遺漏 → **Mitigation**：`npm run build` 會在型別檢查與打包階段對缺失模組報錯，移除後立即跑一次完整 build 驗證
- **[Risk]** AdSense 同意橫幅可能降低廣告曝光率（部分使用者會拒絕）→ **Mitigation**：這是合規要求下的預期取捨，不應該為了曝光率犧牲使用者同意權
- **[Risk]** 測試基礎設施只有一組示範測試，可能給人「已有完整測試」的錯誤印象 → **Mitigation**：README 與 proposal 明確記錄目前覆蓋範圍與後續規劃

## Migration Plan

1. `Icon.tsx` 改用靜態 import 對照表
2. 移除 4 個依賴（`pnpm remove`）、`next.config.ts` 移除 MDX wrapper 與 `pageExtensions` 內的 mdx 項目
3. `.gitignore` 移除 `pnpm-lock.yaml`、`git add pnpm-lock.yaml`
4. 重寫 `README.md`、新增 `.env.example`
5. 刪除 `TestimonialsSection.tsx` 與死翻譯 namespace
6. `WebVitalsReporter` 加上 production 環境守衛
7. 新增 `src/lib/site-config.ts`，套用到 7 處 App Store URL、3 處社群 URL；移除 `community.joinUrl` 翻譯 key
8. 新增 `AdConsentGate`，`layout.tsx` 的 AdSense `<Script>` 改為條件式渲染；新增 `public/ads.txt`
9. `package.json` 新增 `typecheck` script；新增 `.github/workflows/ci.yml`；安裝 Vitest 相關套件、新增 `vitest.config.mts`、`test` script、`safe-raw.test.ts`
10. `npm run build`、`npm run typecheck`、`npm run test` 全部驗證通過

無需 rollback 策略（純新增/移除檔案與依賴，無資料遷移）。

## Open Questions

（無）
