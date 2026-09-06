# DailyVal 官網

[DailyVal](https://apps.apple.com/app/dailyval/id1637782901) 的官方行銷網站，使用 Next.js 16（App Router）與 Tailwind CSS v4 打造。

## 開發

套件管理器為 [pnpm](https://pnpm.io)。

```bash
pnpm install
pnpm dev
```

在瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。

## 環境變數

複製 `.env.example` 為 `.env.local` 並依需求填入：

- `NEXT_PUBLIC_BASE_URL`：網站正式網址，用於 metadata、sitemap、OG 圖片等絕對路徑組成
- `NEXT_PUBLIC_CREATOR_FORM_ENDPOINT`：`/creators` 頁面申請表單送出用的 Google Apps Script webhook URL

## 常用指令

```bash
pnpm dev         # 開發伺服器
pnpm build       # production build
pnpm start       # 啟動 production build
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
```

## 技術棧

- **框架**：Next.js 16（App Router）+ TypeScript
- **樣式**：Tailwind CSS v4，自訂 HUD 風格 design token（見 `docs/dailyval-project-spec.md`）
- **字型**：Orbitron（display）／Rajdhani（UI 標籤）／Noto Sans TC（中文內文），透過 `next/font/google` 載入
- **i18n**：[next-intl](https://next-intl.dev)，支援 `zh-TW`（預設）與 `en`，路由前綴為 `/<locale>/...`
- **圖示**：[Phosphor Icons](https://phosphoricons.com)，統一透過 `src/components/Icon.tsx` 使用
- **OG 圖片**：`src/app/og/route.tsx`（`next/og`，edge runtime）

## 專案結構

```
src/app/[locale]/       # 各語系頁面（首頁、announcements、creators、tos、privacy、support）
src/components/         # 共用元件
src/lib/                # 共用工具函式（SEO metadata、i18n 安全存取、常數等）
messages/               # next-intl 翻譯檔（en.json / zh-TW.json）
openspec/                # Spectra 規格驅動開發文件（specs / changes）
docs/                    # 專案文件（產品規格書等）
```

## 規格驅動開發

本專案使用 [Spectra](https://github.com/spectra-app/spectra) 進行 Spec-Driven Development，規格文件在 `openspec/specs/`，變更提案在 `openspec/changes/`。詳見 `CLAUDE.md`。
