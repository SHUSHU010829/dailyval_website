## Context

三個法律頁面（/tos、/privacy、/support）在 add-foundation 時已建立路由與佔位符 TSX，本 change 填入完整內容。

## Goals / Non-Goals

**Goals:**
- 中英雙語法律內容，依 locale 自動切換
- 統一版型元件（LegalLayout）與散文 CSS
- 所有頁面通過 `npm run build` 靜態生成

**Non-Goals:**
- 不引入 MDX（內容量適中，直接 JSX 維護成本更低）
- 不做多語系動態載入（僅 zh-TW / en 兩種）

## Decisions

### 以 locale 條件式 JSX 而非 i18n JSON 管理法律內容

**選擇：** 在各頁面 TSX 中以 `const isZh = locale === "zh-TW"` 切換中英 JSX 內容區塊。

**理由：** 法律文字篇幅長、結構複雜（含巢狀清單、mailto 連結），放入 JSON 可讀性差且難以維護。直接 JSX 讓編輯者清楚看到完整文件結構。後續若需 CMS 整合，再遷移至 MDX。

### LegalLayout 元件集中排版責任

**選擇：** 抽出 `LegalLayout` 元件統一處理返回連結、標題、日期/聯絡資訊、`.prose-legal` 包裹。

**理由：** 三頁版型完全一致，集中後日後修改只需改一個檔案。

## Risks / Trade-offs

- **中英文字維護分離**：中英兩個 JSX 區塊需手動保持同步。→ 緩解：以相同 h2 標題順序排列，diff 時易對照。
