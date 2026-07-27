## Context

官網以 `--text-1/2/3` 三層文字色階與品牌紅 `--val-red` 為核心設計 token（定義於 `dailyval-project-spec.md` 與 `src/app/globals.css`）。`performance-a11y` spec 已明訂 body text 需 ≥4.5:1 對比度、且非當前語系頁面禁止寫死文字；`design-system` spec 則要求 CSS token 的實際數值需與 `dailyval-project-spec.md` 一致。目前程式碼實作在兩者上都有落差。

`tos`／`privacy` 頁面是標準法律模板文字（Termly/GetTerms 風格），目前完全沒有中文版；`support` 頁面則相反，中英文內容都已經寫好，只是用 `isZh ? (...) : (...)` 三元式繞過了 next-intl。`CreatorApplicationForm.tsx` 是全站唯一有表單狀態（成功/錯誤）與 `t.raw()` 密集使用的元件。

## Goals / Non-Goals

**Goals:**

- 讓游標、對比度、i18n 覆蓋率符合既有 spec 要求
- 讓翻譯內容缺漏時優雅降級，而非讓整頁 render 崩潰
- 補上關鍵無障礙缺口（skip-link、表單狀態通知、focus-visible、行動版版面遮擋）
- `/creators` 表單的原生 select/checkbox 外觀對齊站上 HUD 視覺語言

**Non-Goals:**

- 不新增法律文件的正式中文翻譯（見 proposal Non-Goals）
- 不重新設計三層文字色階的視覺關係，僅將 `--text-3` 調整到達標

## Decisions

### `--text-3` 調整為 alpha 0.5，而非新增第 4 層文字色階

實測 `rgba(234,234,240, α)` 疊在 `#0a0a0f` 上，α=0.3 時對比度 2.36:1，α=0.5 時 4.63:1（已通過 4.5:1 門檻並留有安全餘裕）。`--text-3` 在程式碼中僅用於 `text-xs`／`text-[10px]`／`text-[9px]` 等小字級（footer、統計標籤、法律頁返回連結等 26 處），沒有任何「大字級」使用場景可以套用 3:1 的寬鬆門檻，因此必須達到 4.5:1。

- **考慮過的替代方案**：新增第 4 層文字色階（如 `--text-4` 用於真正裝飾性、非內容的文字）並讓 `--text-3` 只用在真正次要內容上 → 需要逐一檢視 26 處使用場景並重新分類，工程量遠超本次變更範圍，故不採用；直接調整現有 token 是風險最低的修正

### CTA 按鈕文字改用 `text-bg-base`，而非調深 `val-red`

站上綠色（`NEW` 徽章）與藍色（`COMING SOON` 徽章）已經是用 `text-bg-base`（深色文字疊在鮮豔背景上）達到足夠對比度，這是既有慣例。沿用同樣模式（白字 3.35:1 → 深色文字 5.89:1），而非調深 `--val-red` 品牌色。

- **考慮過的替代方案**：把 `--val-red` 從 `#ff4655` 調深至如 `#e01f2d`（白字對比度可達 4.77:1）→ 品牌紅是全站辨識度最高的顏色（App icon、行銷素材都使用 `#ff4655`），調整品牌色屬於更大範圍的視覺決策，不適合在無障礙修補變更中一併處理；改文字色是侷限在 7 個按鈕元件內的局部修正，風險與範圍都更小

### 法律頁維持英文原文，新增翻譯過的「本頁尚無中文版」提示

`tos`／`privacy` 內文保持不變（避免未經法律審閱的翻譯內容上線），但新增 `legal.englishOnlyNotice` 翻譯 key，在 `locale !== "en"` 時顯示於內文最上方，讓使用者清楚知道這是刻意保留英文、而非翻譯遺漏的 bug。`backLabel` 改用既有但目前是死碼的 `common.backHome` key，讓頁面周邊的導覽文字至少是雙語的。

- **考慮過的替代方案**：完全不處理，維持現況 → 使用者體驗上與「忘記翻譯」無法區分，且不修正已死碼的 `common.backHome`；由 AI 直接生成法律翻譯 → 已與使用者確認排除，法律文件翻譯需要正式審閱

### 新增 `safeRaw()` 工具函式，而非在每個呼叫點各自加 try/catch

`t.raw()` 在 `FeaturesSection`、`CreatorApplicationForm`（7 處）、`creators/page.tsx`（6 處）共 14 處呼叫點都是未防護的 `as` 轉型。建立單一 `src/lib/safe-raw.ts` 提供 `safeRaw<T>(t, key, fallback)`，內部 try/catch 並在缺漏時回傳呼叫端提供的 fallback、於開發環境 `console.error` 警告，取代逐一手寫防護邏輯。`SocialProofSection.tsx` 已經有等效的 `Array.isArray` 手動防護，維持不變（不強制統一寫法，避免無謂改動已經正確的程式碼）。

- **考慮過的替代方案**：在每個呼叫點各自寫 `Array.isArray` 檢查（比照 `SocialProofSection` 現有寫法）→ 14 處重複邏輯，且部分回傳型別不是陣列（如 FAQ 的巢狀物件），共用工具函式更一致好維護

### Skip-to-content 連結放在 `[locale]/layout.tsx`，而非 root layout

`<main>` 元素定義在 `[locale]/layout.tsx`（root layout 只負責 `html`/`body` 與字型），skip link 需要與其 `id="main-content"` 目標在同一個渲染樹層級才能確保視覺順序（skip link 必須是 DOM 中第一個可 focus 元素，早於 `SiteNav`）。

## Risks / Trade-offs

- **[Risk]** `--text-3` 提高到 0.5 後與 `--text-2`（0.55）視覺上非常接近，三層文字色階的層次感減弱 → **Mitigation**：已記錄為已知取捨（見 Non-Goals），對比度合規優先於視覺層次的微妙差異；未來如需重建色階層次應開新變更處理
- **[Risk]** 法律頁新增的「本頁尚無中文版」提示等於是公開承認網站雙語覆蓋不完整 → **Mitigation**：這是誠實揭露而非隱藏問題；比起現狀（讓使用者誤以為是 bug）對使用者體驗更好
- **[Risk]** `safeRaw()` 的 fallback 值選擇不當可能讓頁面「安靜地」渲染不完整內容而非明顯報錯 → **Mitigation**：fallback 一律搭配 `console.error` 開發期警告，且 fallback 值選擇為空陣列／安全預設，不會產生執行期錯誤，僅在生產環境優雅降級

## Migration Plan

1. `globals.css`：cursor 媒體查詢修正、`--text-3` 調整、新增 `.select-hud`／`.checkbox-hud`
2. `dailyval-project-spec.md`：同步更新 `--text-3` 色票數值
3. 7 個 CTA 按鈕元件：`text-white` → `text-bg-base`
4. 新增 `src/lib/safe-raw.ts`，套用到 `FeaturesSection.tsx`、`CreatorApplicationForm.tsx`、`creators/page.tsx`
5. `support/page.tsx` 內容遷移進 `messages/*.json`；`AppStoreQRCode.tsx`、`CommunitySection.tsx` 文字/預覽貼文遷移進翻譯檔
6. `tos.tsx`／`privacy.tsx`：`backLabel` 改用 `common.backHome`；新增 `legal.englishOnlyNotice` 提示
7. `[locale]/layout.tsx`：skip-to-content 連結、`<main>` 加 `id="main-content"` 與行動版底部 padding
8. `CreatorApplicationForm.tsx`：狀態區塊 `role="alert"`、chips `focus-visible`、5 個 select 改 `.select-hud`、checkbox 改 `.checkbox-hud`
9. `npm run build` 驗證

無需 rollback 策略（純樣式/內容/標記調整，無資料遷移）。

## Open Questions

（無）
