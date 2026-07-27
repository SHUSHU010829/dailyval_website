## Context

官網是 Next.js 16 App Router 專案，i18n 路由為 `/<locale>/...`（`en` / `zh-TW`），所有頁面 metadata 透過 `src/lib/seo.ts` 的 `buildMetadata()` 統一產生。OG 圖片是 `src/app/og/route.tsx`（edge runtime，`next/og` 的 `ImageResponse`），目前讀取 `public/appicon.png`（2648×2648, 1.66MB）並在 runtime base64 內嵌。站上目前沒有任何 `sitemap.ts`／`robots.ts`／structured data，也沒有 `metadataBase`。

`/creators` 頁面已經有真實的 FAQ 內容（`creators.faq.items`，5 組問答，來自 `messages/<locale>.json`），可直接對應 `FAQPage` schema。首頁的 `socialProof` 區塊已經公開展示「1,200,000+ 活躍玩家」「4.7★ App Store 評分」「15,600+ 五星好評」等數字，可作為 `SoftwareApplication` + `aggregateRating` 的資料來源。

## Goals / Non-Goals

**Goals:**

- 補齊 sitemap / robots / metadataBase 三項技術 SEO 基礎設施
- 加入與頁面現有內容一致的結構化資料，不新增未展示的內容
- 讓 OG 圖片在 Vercel Edge Function 大小限制內穩定運作
- 讓 OG 圖片視覺上反映各頁面的 `title`，不再五頁幾乎一樣
- 清除已確認無法被觸達的死碼（`/og/square`、`resolvedTwitterImage`、`[locale]/layout.tsx` 的 `generateMetadata`）

**Non-Goals:**

- 不做多尺寸 OG 圖片（LinkedIn、Pinterest 等平台專用比例）
- 不整合 Google Search Console 或第三方 SEO 監控服務
- 不新增 `Organization` / `BreadcrumbList` 等其他 JSON-LD 型別

## Decisions

### 使用預先縮圖的靜態檔案，而非 runtime 動態縮圖

`appicon.png` 在 OG 圖裡只以 300×300 顯示（`og/route.tsx:334-335`）。選擇在建置前用 `sips` 產生固定的 `public/appicon-og.png`（600×600，2x 顯示解析度，約 160KB），OG route 直接 fetch 這個小檔案並 base64。

- **考慮過的替代方案**：在 edge function 內用 `next/image` 或其他函式庫動態縮圖 → edge runtime 對原生影像處理函式庫支援有限，且原圖仍需先被讀入記憶體，無法真正解決 bundle 大小問題
- base64 後（160KB → 約 213KB）遠低於 Vercel Hobby 方案 1MB 的 Edge Function 限制

### OG 圖片渲染 `title`，而非只用於字型子集化

在既有的「DailyVal」glitch 三層 wordmark 上方新增一行 kicker 文字渲染 `title`（沿用 `truncate(..., 80)` 已有的截斷邏輯），品牌 wordmark 維持不變以保留視覺識別度。`description` 的渲染位置與樣式不變。

- **考慮過的替代方案**：把 wordmark 直接換成 `title` 文字 → 首頁 `title` 目前是「DailyVal」本身沒有明顯差異，但其他頁面（如「服務條款 | DailyVal」）套用大寫 + `letter-spacing: 0.1em` 的展示字重容易溢出版面，且會犧牲品牌識別度，故不採用

### 移除 `/og/square` 與 `resolvedTwitterImage`，而非修正 bug 讓它被觸達

`seo.ts:41` 的 `resolvedTwitterImage` 因為第 82 行寫死傳入 `resolvedOgImage` 而永遠不會被使用，此 bug 反而讓現況符合 Twitter 官方建議：`summary_large_image` 卡片規格建議圖片比例 2:1（本站 OG 圖為 1200×630），若真的接上方形（1:1）的 `/og/square` 圖片反而會不符建議比例。因此選擇移除死碼而非修正 bug 讓其生效。

- **考慮過的替代方案**：修正 `seo.ts:82` 讓 Twitter 卡實際使用方形圖 → 會讓 Twitter 卡片改用不符官方建議比例的圖片，屬於倒退，故不採用

### `aggregateRating` 的 `ratingCount` 直接取用站上既有公開文案

`socialProof.items` 已經公開顯示「15,600+ 五星好評」。結構化資料的 `ratingCount` 直接使用這個站方已公開發布的數字（15600），不額外向 App Store 或後端查證新數字。若未來實際評論數與此文案不同步，需同時更新兩處。

- **考慮過的替代方案**：省略 `aggregateRating`，只留 `SoftwareApplication` 基本欄位 → 會少掉 Google 搜尋結果中顯示星等評分的機會；但因為找不到比 `socialProof` 文案更精確的即時資料來源，此為現階段可行的折衷

### `metadataBase` 放在 `seo.ts` 而非各頁 `layout.tsx`

在 `buildMetadata()` 回傳值中加入 `metadataBase: new URL(BASE_URL)`，讓所有透過 `buildMetadata()` 產生 metadata 的頁面自動繼承，不需要每個 `layout.tsx` 各自宣告。

## Risks / Trade-offs

- **[Risk]** `aggregateRating.ratingCount` 使用行銷文案數字而非 App Store Connect 精確資料，可能與實際評論數有落差 → **Mitigation**：於 design 中明確記錄資料來源是 `socialProof` 文案，未來如接上 App Store API 應同步更新此處
- **[Risk]** 刪除 `/og/square` 路由屬於移除既有（雖未被使用的）public route → **Mitigation**：已確認 `seo.ts` 內無任何呼叫路徑會產生指向 `/og/square` 的 URL，且該路由本身未被任何前端程式碼引用，移除後不影響任何現有連結
- **[Risk]** OG 圖新增 kicker 文字行可能在極長 title（如某些語系翻譯）時溢出 → **Mitigation**：沿用既有 `truncate(title, 80)` 邏輯並將 kicker 字級設定得比 wordmark 小，長文字會自然換行於 flex column 容器內

## Migration Plan

1. 產生 `public/appicon-og.png`（一次性 `sips` 縮圖操作，非 runtime 邏輯）
2. 修改 `seo.ts`：加入 `metadataBase`，移除 `resolvedTwitterImage`／`defaultTwitterImage`
3. 刪除 `src/app/og/square/route.tsx`
4. 修改 `og/route.tsx`：改讀 `appicon-og.png`、渲染 `title`、更新統計數字
5. 新增 `sitemap.ts`／`robots.ts`
6. 在首頁與 `/creators` 頁面元件中注入對應的 JSON-LD `<script>`
7. 更新 `meta.home.title` 翻譯字串
8. 移除 `[locale]/layout.tsx` 內死碼 `generateMetadata`
9. `npm run build` 驗證，並手動檢查 `/og?title=...` 與 `/sitemap.xml`、`/robots.txt` 輸出

無需 rollback 策略（純新增/修正檔案，無資料庫或狀態遷移）。

## Open Questions

（無）
