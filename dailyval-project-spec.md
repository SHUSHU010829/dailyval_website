# DailyVal 官網重建 — 專案規格書

## 1. 專案總覽

| 項目 | 內容 |
|------|------|
| 專案名稱 | DailyVal 官方網站 |
| 目標 | 為突破百萬下載的 DailyVal iOS App 建立電競風格官網，提升品牌專業度與下載轉化率 |
| 核心受眾 | Valorant 硬核玩家、電競愛好者、數據分析型用戶 |
| 設計風格 | 電競 Hub Portal — 工業風深色模式、故障風特效、霓虹點綴、銳角切邊 |
| 現有網站 | https://ios.dailyval.com |
| 目標網域 | ✅ `dailyval.com` |
| 多語系 | ✅ 中文 / English 雙語（Next.js App Router i18n routing） |

---

## 2. 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Next.js (App Router) | SSG 為主，SEO 友好、效能優先 |
| 樣式 | Tailwind CSS v4 | 高效開發、小體積 CSS |
| 動畫 | Framer Motion + GSAP | Framer Motion 為主要動畫引擎（scroll、transition、micro-interaction）；GSAP 用於 Hero 多階段 timeline、複雜 parallax 等場景 |
| 語言 | TypeScript | 型別安全 |
| 部署 | Vercel | 全球 CDN、自動 Preview Deploy |
| 內容格式 | MDX | 法律條款 (TOS/Privacy)、Support 頁面 |
| 套件管理 | pnpm | 快速、節省磁碟空間 |
| Icon 圖標 | Phosphor Icons | MIT 授權、商用免費、支援 React、6 種粗細風格 |

### 動畫分工

| 場景 | 使用 | 原因 |
|------|------|------|
| 卡片進場、hover、頁面 transition | Framer Motion | Declarative API，與 React 整合最佳 |
| `useInView` scroll-triggered reveal | Framer Motion | 內建支援，無需額外設定 |
| Hero 區多階段進場 timeline | GSAP Timeline | 精確控制多元素的 staggered sequence |
| 視差滾動 (Parallax) | GSAP ScrollTrigger | 效能好、支援 pin/scrub |
| Glitch 特效、霓虹脈衝 | CSS Animation | 純 CSS 最高效 |
| 商城紅外線掃描光效 | GSAP | Section 3a 圖片進入視線時，從上到下的掃描線動畫 |
| 戰術游標交互（延遲光點 + Hitmarker） | Framer Motion | 點擊 CTA 時產生命中標記 X 效果 |

### GSAP 授權注意

GSAP 免費版適用於非付費產品的網站。DailyVal 官網屬於 App 行銷頁面（非 SaaS 付費工具），使用免費版即可。如有疑慮可參考 [GSAP licensing FAQ](https://gsap.com/community/forums/topic/36360-licensing-faq/)。

### Icon 圖標規範

**選用：[Phosphor Icons](https://phosphoricons.com/)**

| 項目 | 說明 |
|------|------|
| 授權 | MIT License — 商用免費、無需署名 |
| 套件 | `@phosphor-icons/react` |
| 風格 | 統一使用 `bold` 或 `fill` 風格（配合電競銳利感） |
| 大小 | 功能卡片 icon: 24-32px / Section icon: 20px |
| 顏色 | 繼承 CSS `currentColor`，搭配各功能的霓虹色 |

選擇理由：Phosphor 提供 6 種粗細風格（thin / light / regular / bold / fill / duotone），bold 和 fill 風格的銳利線條與電競工業風高度契合。相比 Lucide（線條偏細柔）和 Heroicons（選項較少），Phosphor 的 bold 風格更有力量感。

**備選方案：**
- [Tabler Icons](https://tabler.io/icons)（4,500+ icons，MIT，stroke 風格為主）
- [Lucide](https://lucide.dev/)（fork of Feather，ISC 授權，較多 React 生態整合）

---

## 3. 頁面架構 (Sitemap)

```
dailyval.com
├── /                    → 首頁 (Landing Page)
├── /[locale]/support    → 幫助中心
├── /[locale]/tos        → 服務條款
└── /[locale]/privacy    → 隱私政策
```

### i18n 路由結構

```
/zh-TW/          → 中文首頁（預設）
/en/             → English Landing
/zh-TW/tos       → 中文服務條款
/en/tos          → English Terms of Service
...
```

- 預設語言：`zh-TW`
- 支援語言：`zh-TW`, `en`
- 語言偵測：根據 `Accept-Language` header 自動導向，用戶可手動切換
- 翻譯方案：JSON 檔案（`/messages/zh-TW.json`, `/messages/en.json`）搭配 `next-intl` 或類似方案

---

## 4. App 功能清單

官網需要展示的 DailyVal 功能，按類別分組：

### 核心功能

| 功能 | 說明 | Phosphor Icon | 霓虹色 | 展示層級 |
|------|------|---------------|--------|----------|
| 每日商城 | 即時追蹤商城造型輪替，不再錯過任何心愛造型 | `Storefront` | val-red | Showcase（大區塊） |
| 造型評分 | 查看其他玩家對造型的評分與評價，購買前先做功課 | `Star` | gold | Showcase 內子區塊 |
| 回合戰績 | 查看自身或任何玩家的詳細戰績數據 | `ChartBar` | jett-blue | Showcase（大區塊） |
| 裝備造型管理 | 查看已有造型、遠端更換武器裝備搭配 | `Backpack` | gold | Bento Grid 卡片 |
| 即時對戰 | 實時監控進行中的比賽，掌握最新戰況 | `Lightning` | val-red | Bento Grid 卡片 |
| 每日配對 | 找隊友不難！配對系統幫你找到合適的戰友 | `HandshakeSlash` → `Handshake` | viper-green | Bento Grid 卡片 |
| 遠端選角 | 不在電腦前也能預選特務，為團隊戰略部署 | `GameController` | omen-purple | Bento Grid 卡片 |

### 社群功能

| 功能 | 說明 | 展示方式 |
|------|------|----------|
| 社群看板 | 亞洲最活躍 Valorant 社群（social.dailyval.com） | 獨立 Section + 外連 |

### Premium 功能

| 功能 | 說明 | 標記 |
|------|------|------|
| 遠端選角 | 即使不在遊戲中也能提前選擇特務 | `PREMIUM` 標籤 |

### 即將上線

| 功能 | 說明 | Phosphor Icon | 標記 |
|------|------|---------------|------|
| 查看好友動態 | 查看好友動態，發出組隊邀請 | `UsersThree` | `COMING SOON` 標籤 |

---

## 5. 首頁區塊規格

### 整體結構

```
┌─────────────────────────────────────┐
│  Nav (Fixed)                        │
├─────────────────────────────────────┤
│  Section 1: Hero                    │
├─────────────────────────────────────┤
│  Section 2: Social Proof            │
├─────────────────────────────────────┤
│  Section 3: Features（統一功能展示） │
│  ┌─ 3a: Showcase — 每日商城+造型評分│
│  ├─ 3b: Showcase — 回合戰績         │
│  └─ 3c: Bento Grid — 其餘功能卡片   │
├─────────────────────────────────────┤
│  Section 4: Community Hub           │
├─────────────────────────────────────┤
│  Section 5: Testimonials            │
├─────────────────────────────────────┤
│  Section 6: Final CTA               │
├─────────────────────────────────────┤
│  Footer                             │
└─────────────────────────────────────┘
```

---

### Section 0: Navigation Bar (Fixed)

| 項目 | 規格 |
|------|------|
| Logo | DailyVal Logo + 文字（切角造型） |
| 連結 | 功能特點、社群、常見問題 |
| CTA | 「立即下載」按鈕（切角紅色，hover 發光 + 光掃效果） |
| 語言切換 | 右側語言切換按鈕（ZH / EN） |
| 行為 | 滾動時半透明毛玻璃 `backdrop-filter: blur()` + 底部邊線轉紅 |
| Mobile | 極簡模式：Logo + 語言切換 + CTA |

### Section 1: Hero

| 項目 | 規格 |
|------|------|
| 標題 | Glitch 特效主標 "DAILYVAL" + 漸層副標「隨時掌握遊戲動態」 |
| Slogan | 電競戰術語調 |
| 視覺主體 | ✅ iPhone 16 Pro Mockup + 真實 App 截圖（之後列表出來慢慢補充） |
| CTA | 主按鈕「立即部署」→ App Store / 副按鈕「檢視功能」→ 錨點 |
| Universal Links | ✅ 實作 iOS Universal Links。iPhone 用戶點擊「立即部署」時：已安裝 App → 直接喚起 App 並跳轉對應功能頁（如商城）；未安裝 → 導向 App Store。需配置 `apple-app-site-association` 檔案於 `dailyval.com/.well-known/` |
| QR Code | 電腦版（`md:` breakpoint 以上）顯示 App Store 下載 QR Code，手機版隱藏。iOS 點開能直接導向 App，未安裝則導向 App Store |
| 背景 | 電路板網格紋理 + CRT 掃描線 overlay + 紅/藍雙色 radial glow |
| HUD 元素 | 四角戰術角標、右上角系統狀態資訊（SYS:ONLINE / REGION:AP / PING） |
| 動畫 | GSAP Timeline 多階段進場：badge → 主標(glitch) → 副標 → CTA → Stats → Phone mockup；特務剪影 GSAP ScrollTrigger parallax |

### Section 2: Social Proof

| 項目 | 規格 |
|------|------|
| 核心數據 | `900,000+` 活躍用戶 / `4.8★` App Store 評分 15,600+ 評價 / `#1 亞洲 Valorant App` |
| 呈現方式 | 切角面板，數字用 Orbitron + countUp 動畫（Framer Motion `useInView` 觸發） |
| countUp 效果 | 活躍用戶數從 `890,000` 跳動至 `900,000+`，營造「App 正在壯大」的即時感。使用 `requestAnimationFrame` 實作數字滾動，配合 easeOut 緩動曲線，總時長約 2 秒 |

### Section 3: Features（統一功能展示）

一個完整的 Section，內部分三層，由上往下滾動時依序呈現：

#### 3a: Showcase — 每日商城 + 造型評分

| 項目 | 規格 |
|------|------|
| 佈局 | 左右圖文交錯（左：App 截圖 / 右：功能說明） |
| 商城展示 | 造型預覽卡片 + 商城重置倒數計時（時:分:秒） |
| 造型評分 | 在同一區塊內展示星級評分 UI、玩家評價數量 |
| 文案重點 | 「即時掌握商城動態，買造型前先看社群評價」 |
| 視覺 | ✅ App 內截圖（由 SHUSHU 提供） |
| Icon | `Storefront` (bold, val-red) / `Star` (bold, gold) |
| FOMO 引導 | 「怕錯過心愛造型？」→ CTA 引導下載 |
| 版權策略 | 使用 App 內截圖（功能展示），不直接使用 Riot 官方造型原圖 |
| 掃描光效 | 商城截圖進入視線時，觸發一道 val-red 紅外線從上到下掃過圖片，模擬遊戲中掃描裝備的感覺。用 GSAP ScrollTrigger 觸發，CSS `linear-gradient` + `translateY` 動畫實作，掃描完成後淡出 |

#### 3b: Showcase — 回合戰績

| 項目 | 規格 |
|------|------|
| 佈局 | 左右圖文交錯（方向與 3a 相反） |
| 內容 | 戰績追蹤、數據分析功能展示 |
| 強調 | 可查看自身或**任何玩家**的戰績 |
| 視覺化 | K/D 柱狀圖、勝率趨勢、爆頭率等（模擬數據 + App 截圖） |
| Icon | `ChartBar` (bold, jett-blue) |
| 動畫 | 圖表在 scroll into view 時觸發 Framer Motion 填充動畫 |

#### 3c: Bento Grid — 其餘功能

Showcase 下方，用 Bento Grid 展示剩餘功能。

| 卡片 | Grid 大小 | Icon (Phosphor bold) | 霓虹色 | 標籤 |
|------|-----------|---------------------|--------|------|
| 裝備造型管理 | 1×1 | `Backpack` | gold | — |
| 即時對戰 | 1×1 | `Lightning` | val-red | — |
| 每日配對 | 1×1 | `Handshake` | viper-green | `NEW` |
| 遠端選角 | 1×1 | `GameController` | omen-purple | `PREMIUM` |
| 查看好友動態 | 1×1 | `UsersThree` | jett-blue | `COMING SOON` |

**Bento Grid 設計要點：**
- 桌面版：3 欄或 4 欄，卡片等高
- 手機版：2 欄或單欄堆疊
- 每張卡片：Icon（頂部，帶霓虹 glow 背景切角容器）+ 功能名稱 + 一行描述
- 有標籤的卡片：右上角顯示切角標籤（顏色見設計規範）
- hover 效果：頂部紅→藍漸層線掃過 + 背景微亮 + 卡片上浮 4px

---

### Section 4: Community Hub（社群）

| 項目 | 規格 |
|------|------|
| 策略 | ✅ 展示社群精選預覽 + 導向 `social.dailyval.com` |
| 佈局 | Bento Grid 展示 2-3 則精選社群內容卡片 |
| 內容來源 | 靜態精選內容（手動挑選代表性貼文截圖或模擬） |
| CTA | 「探索社群」按鈕 → 連結至 `https://social.dailyval.com/zh-TW`（中文）或對應語系 |
| Icon | `ChatCircleDots` (bold) |
| 備註 | 不做 iframe 嵌入（影響效能和 SEO），改用卡片式預覽 + 外連 |

### Section 5: Testimonials（用戶評價）

| 項目 | 規格 |
|------|------|
| 呈現 | 橫向滾動卡片（切角造型），支援觸控滑動 |
| 來源 | App Store 真實評論（摘錄改寫） |
| 風格 | Valorant 遊戲內 UI 風格卡片，含星級、暱稱、日期 |
| 數量 | 5-8 則 |

### Section 6: Final CTA

| 項目 | 規格 |
|------|------|
| 內容 | 大標「準備好加入百萬特務的行列了嗎」 |
| CTA | 「立即部署」按鈕 + App Store Badge |
| Universal Links | 同 Hero CTA，已安裝 App 則直接喚起 |
| 背景 | 紅色 radial glow 氛圍 |

### Footer

| 項目 | 規格 |
|------|------|
| 欄位 | 產品 / 支援 / 法律 三欄 |
| 社群連結 | [Instagram](https://www.instagram.com/dailyval_official/) / [Threads](https://www.threads.com/@dailyval_official) |
| 語言切換 | ZH / EN 切換 |
| Riot 免責聲明 | **必須包含**：「DailyVal is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Valorant. Valorant and Riot Games are trademarks or registered trademarks of Riot Games, Inc.」 |
| 版權 | © 2026 DailyVal. All rights reserved. |

---

## 6. 法律頁面規格

| 頁面 | 路由 | 格式 | 說明 |
|------|------|------|------|
| 服務條款 | `/[locale]/tos` | MDX | 戰術簡報摘要 + 可展開全文 |
| 隱私政策 | `/[locale]/privacy` | MDX | 同上 |
| 幫助中心 | `/[locale]/support` | MDX | FAQ 手風琴式展開 |

### 法律頁面 UX

- 頂部：4 張「戰術簡報」風格摘要卡片，提煉關鍵條款
- 下方：完整條款預設摺疊，點擊「展開完整條款」展開
- 整體保持暗色電競風格，不跳出設計體系
- 中/英各一份 MDX 檔案（`/content/zh-TW/tos.mdx`, `/content/en/tos.mdx`）
- 法律頁面全文區塊**嚴格使用 Noto Sans TC**（不用 Orbitron），確保長文閱讀舒適度

### 戰術簡報摘要卡片內容

| 卡片標題 | Icon (Phosphor) | 摘要內容 |
|----------|-----------------|----------|
| 帳號與隱私 | `ShieldCheck` | 我們會收集設備 ID、IP 與使用數據以優化體驗，但絕不儲存您的遊戲登入密碼。 |
| 訂閱與退款 | `CreditCard` | 訂閱採自動續訂制，需在到期 24 小時前手動取消；當前週期不提供退款。 |
| 法律賠償上限 | `Scales` | 在法律允許範圍內，最大賠償責任限額為您實際支付的金額或 100 USD。 |
| 年齡限制 | `User` | 本服務僅限 18 歲以上用戶使用，13 歲以下之個人資料若誤採將會刪除。 |

---

## 7. 設計規範 (Design Token)

### 配色

| Token | 色碼 | 用途 |
|-------|------|------|
| `--bg-base` | `#0a0a0f` | 頁面底色 |
| `--bg-panel` | `#0e0e16` | 卡片/面板 |
| `--bg-panel-hover` | `#14141f` | 卡片 hover |
| `--bg-elevated` | `#111119` | 區隔底色（reviews 區等） |
| `--val-red` | `#FF4655` | 主色 CTA、重點標註 |
| `--val-red-glow` | `rgba(255,70,85,0.5)` | 紅色光暈 |
| `--jett-blue` | `#5ee5ff` | 次要強調、數據、連結 |
| `--viper-green` | `#2dff73` | 正向指標、成功狀態 |
| `--omen-purple` | `#9b5dff` | 輔助裝飾 |
| `--gold` | `#ffd666` | 星級評分 |
| `--text-1` | `#eaeaf0` | 主要文字 |
| `--text-2` | `rgba(234,234,240,0.55)` | 次要文字 |
| `--text-3` | `rgba(234,234,240,0.3)` | 輔助文字 |
| `--border-dim` | `rgba(255,255,255,0.04)` | 基礎邊框 |
| `--border-med` | `rgba(255,255,255,0.08)` | 一般邊框 |
| `--border-bright` | `rgba(255,255,255,0.14)` | 強調邊框 |

### 字型

| 用途 | 字型 | 載入方式 | 備註 |
|------|------|----------|------|
| Display / 標題 | Orbitron | Google Fonts `display=swap` | 電競科技感、全大寫、letter-spacing: 2-4px |
| UI / 標籤 | Rajdhani | Google Fonts `display=swap` | 銳利幾何風格、uppercase labels |
| 內文 / 中文 | Noto Sans TC | Google Fonts `display=swap` | CJK 支援、400/500/700/900 |

### 功能標籤樣式

| 標籤 | 背景色 | 文字色 | 用途 |
|------|--------|--------|------|
| `PREMIUM` | `--omen-purple` | white | 標記付費功能（遠端選角） |
| `NEW` | `--viper-green` | `--bg-base` | 標記新功能（造型評分、每日配對） |
| `COMING SOON` | `--jett-blue` | `--bg-base` | 標記即將上線（查看好友動態） |

標籤造型：`clip-path` 切角、`font-family: Orbitron`、`font-size: 10px`、`letter-spacing: 2px`、`text-transform: uppercase`

### 視覺語彙

- 所有互動元素使用 `clip-path` 銳角切邊（`--cut: 12px`）
- 背景層疊：電路板網格（`background-image` 多層 linear-gradient）+ CRT 掃描線（`repeating-linear-gradient`）
- Glitch 特效：CSS `::before` / `::after` 偽元素 + `clip-path: inset()` 動畫，用於主標題
- 霓虹 glow：`box-shadow: 0 0 Npx var(--color-glow)` / `text-shadow` 用於重點元素
- 分隔線：菱形 diamond `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` 置中
- **Icon 全站統一使用 Phosphor Icons bold 風格，不使用 emoji**

### 戰術游標 (Tactical Cursor)

- 基礎游標：`crosshair`（全站）
- 延遲跟隨光點：滑鼠位置附帶一個 4px 的 val-red 小光點，帶 `120ms` 延遲跟隨（CSS `transition` 或 Framer Motion `useSpring`）
- Hitmarker 點擊效果：點擊任何 CTA 按鈕時，游標位置產生一個快速展開+消失的 X 形命中標記，模擬遊戲中擊殺反饋。用 CSS `::after` pseudo-element + `scale` + `opacity` 動畫，時長約 300ms

### 無障礙與動態偏好 (A11y)

- **`prefers-reduced-motion` 支援：** 所有動畫（Glitch、掃描線、視差、countUp、游標光點）需包裹在 `@media (prefers-reduced-motion: no-preference)` 中。若用戶系統開啟「減少動態效果」，自動移除 Glitch 抖動、掃描光效、視差滾動，僅保留基本的 fade-in 過渡
- **字型無障礙：** 法律頁面全文展開區塊嚴格使用 Noto Sans TC，`font-size: 15-16px`、`line-height: 1.8`，確保密集法條的可讀性。Orbitron 僅用於標題和標籤，不用於段落文字
- **顏色對比：** 所有 text-on-background 組合需達 WCAG AA 標準（至少 4.5:1 對比度）

### 版權避險

- **不**直接使用 Riot 官方角色原畫
- 可用：剪影、UI 風格致敬、地圖氛圍圖、App 內截圖
- 影片/圖片格式：WebP 為主、影片用 MP4 H.264（相容性最佳）

---

## 8. i18n 規格

### 架構

```
/src
├── messages/
│   ├── zh-TW.json      → 中文翻譯
│   └── en.json          → 英文翻譯
├── content/
│   ├── zh-TW/
│   │   ├── tos.mdx
│   │   ├── privacy.mdx
│   │   └── support.mdx
│   └── en/
│       ├── tos.mdx
│       ├── privacy.mdx
│       └── support.mdx
└── app/
    └── [locale]/
        ├── page.tsx         → 首頁
        ├── tos/page.tsx
        ├── privacy/page.tsx
        └── support/page.tsx
```

### 翻譯策略

- UI 文字（Nav、按鈕、Section 標題）：JSON key-value
- 長篇內容（法律條款）：各語系獨立 MDX 檔案
- SEO meta：每個語系獨立的 `title` / `description` / `og:image`
- `<html lang="">` 和 `hreflang` 標籤正確設定

---

## 9. 效能目標

| 指標 | 目標 |
|------|------|
| Lighthouse Performance | ≥ 90 |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| INP (Interaction to Next Paint) | < 200ms |
| 首屏載入策略 | 靜態 SSG、Critical CSS inline |
| 圖片 | Next.js `<Image>` 自動 WebP + lazy load + `priority` for hero |
| 影片 | Lazy load、poster frame、行動裝置降級為靜態圖 |
| 字型 | `display=swap`、preconnect Google Fonts |
| 動畫 | `will-change` 限制使用、prefer `transform`/`opacity` |
| Bundle | GSAP 只在 Hero component 動態 import（`next/dynamic`） |
| 動態偏好 | `prefers-reduced-motion` 全站支援，簡化 Glitch / 掃描 / 視差動畫 |
| 無障礙 | WCAG AA 色彩對比、語意化 HTML、`aria-label` on icon buttons |

---

## 10. 素材需求清單

以下素材由 SHUSHU 準備：

| 素材 | 規格 | 用途 | 狀態 |
|------|------|------|------|
| App 截圖 (Hero mockup) | 1290×2796px（iPhone 16 Pro 解析度）| Hero 手機 Mockup | ✅ 有 |
| App 截圖 (商城 + 造型評分) | 同上 | Section 3a: 商城 Showcase | 待提供 |
| App 截圖 (戰績) | 同上 | Section 3b: 戰績 Showcase | 待提供 |
| App 截圖 (社群) | 同上 | Section 4: Community 預覽卡片 | 待提供 |
| App 截圖 (每日配對) | 同上 | Section 3c: Bento Grid 卡片 | 待提供 |
| App 截圖 (裝備管理) | 同上 | Section 3c: Bento Grid 卡片 | 待提供 |
| App 截圖 (即時對戰) | 同上 | Section 3c: Bento Grid 卡片 | 待提供 |
| App 截圖 (遠端選角) | 同上 | Section 3c: Bento Grid 卡片 | 待提供 |
| DailyVal Logo | SVG 格式 | Nav、Footer、OG Image | 待確認格式 |
| OG Image | 1200×630px | 社群分享預覽（中/英各一） | 待製作 |
| App Store QR Code | SVG 或高解析 PNG | Hero 區桌面版 | 待產生 |
| Favicon | ICO + 180×180 apple-touch-icon | 瀏覽器 tab | 待提供 |
| apple-app-site-association | JSON 檔案 | Universal Links 設定（`/.well-known/`） | 待由 iOS 端提供 App ID + path 配置 |

---

*文件版本：v1.4*
*最後更新：2026-04-06*
