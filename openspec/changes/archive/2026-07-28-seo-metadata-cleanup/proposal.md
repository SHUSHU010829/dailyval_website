## Why

官網目前完全沒有 `sitemap.ts`、`robots.ts`、`metadataBase`，也沒有任何結構化資料（JSON-LD），首頁 title 只有「DailyVal」四個字，缺乏可搜尋的關鍵字——這些都是最基礎的 SEO 缺口，直接影響搜尋引擎收錄與排名。

同時 OG（社群分享預覽）圖存在多個具體缺陷：`og/route.tsx` 在 edge function 內把 2648×2648、1.66MB 的 `appicon.png` 讀入並轉成 base64（膨脹後約 2.2MB），有超出 Vercel Edge Function 大小上限（Hobby 1MB／Pro 4MB）而部署失敗的風險；五個頁面各自傳入不同的 `title` 參數給 OG route，但該參數只被拿去做字型子集化，畫面上從未渲染，導致五張 OG 卡片視覺幾乎相同；OG 卡片內寫死的「900K+ 活躍玩家」與站上實際文案「1,200,000+」互相矛盾；`seo.ts` 內 `resolvedTwitterImage` 被算出但第 82 行誤傳成 `resolvedOgImage`，導致方形 OG 圖路由（`/og/square`）永遠無法被觸達，成為死碼。

`[locale]/layout.tsx` 內的 `generateMetadata` 也因為每個頁面自己的 `buildMetadata` 一定會覆蓋其回傳值，等於是永遠不會生效的死碼。

這些問題現在修正成本低（多為既有檔案的局部修正 + 新增兩個標準 Next.js metadata 檔案），若等流量成長後才處理，屆時排名損失與返工成本都會更高。

## What Changes

- 新增 `src/app/sitemap.ts`：涵蓋 `en`／`zh-TW` 兩語系 × 首頁、`/creators`、`/tos`、`/privacy`、`/support` 五個靜態路由
- 新增 `src/app/robots.ts`：允許收錄，並指向新增的 sitemap
- 在 `src/lib/seo.ts` 統一提供 `metadataBase`（`new URL(BASE_URL)`），避免 Next.js 對相對圖片網址發出警告、確保 OG/Twitter 圖片網址在各種部署環境下都能正確組成絕對路徑
- 新增結構化資料（JSON-LD，透過 `<script type="application/ld+json">` 注入）：
  - 首頁：`SoftwareApplication` + `aggregateRating`（`ratingValue: 4.7`、`ratingCount` 取用站上既有公開文案「15,600+ 五星好評」的數值，來源與站上 `socialProof` 文案一致，非憑空捏造）
  - `/creators`：`FAQPage`，內容直接對應頁面上已經渲染的 `creators.faq.items` 翻譯內容（不新增未展示的問答）
- 首頁 `meta.home.title`（`messages/en.json` / `messages/zh-TW.json`）補上具辨識度的關鍵字，不再只是「DailyVal」
- `src/app/og/route.tsx`：
  - 新增預先縮圖的 `public/appicon-og.png`（600×600，約 160KB），取代 runtime 讀取 2648×2648 原圖再 base64 的做法
  - 實際渲染 `title` 參數（目前只用於字型子集化，畫面上未顯示），讓不同頁面的 OG 卡片視覺可被區分
  - 統計數字由「900K+ / 90 萬」改為與站上一致的「1,200,000+ / 120 萬」
- **內部行為不變的死碼移除**：刪除 `src/app/og/square/route.tsx` 與 `src/lib/seo.ts` 內的 `resolvedTwitterImage`／`defaultTwitterImage`。Twitter `summary_large_image` 卡片規格建議 2:1 圖片而非 1:1 方圖，現況（因既有 bug）Twitter 與 OG 本來就共用同一張橫圖，此變更只是移除永遠打不到的死碼路徑，對外行為不變
- 移除 `src/app/[locale]/layout.tsx` 內永遠被覆蓋、不會生效的 `generateMetadata`

## Non-Goals

- 不處理低優先項目（`TacticalCursor` stale closure、scroll listener 節流、`globals.css` 重複 keyframes 等）
- 不建立額外的 OG 圖片尺寸變體（如 LinkedIn 專用比例）；沿用現有 1200×630 單一尺寸
- 不引入外部 SEO 分析工具或 Search Console 串接，僅補齊網站自身可控的技術 SEO 基礎設施
- 不處理 `dailyval_social`（社群版）專案，該專案不在此 repo 內

## Capabilities

### New Capabilities

- `seo-metadata`: 站台 SEO 基礎設施——`sitemap.xml`、`robots.txt`、`metadataBase`、OG 圖片產生規則（尺寸上限、title 渲染、資料正確性）、結構化資料（JSON-LD）

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `seo-metadata`
- Affected code:
  - 新增：`src/app/sitemap.ts`、`src/app/robots.ts`、`public/appicon-og.png`
  - 修改：`src/lib/seo.ts`、`src/app/og/route.tsx`、`src/app/[locale]/layout.tsx`、`src/app/[locale]/page.tsx`（結構化資料注入）、`src/app/[locale]/creators/page.tsx`（結構化資料注入）、`messages/en.json`、`messages/zh-TW.json`（`meta.home.title`）
  - 刪除：`src/app/og/square/route.tsx`
