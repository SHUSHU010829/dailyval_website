<!-- SPECTRA:START v1.0.1 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra:*` skills when:

- A discussion needs structure before coding → `/spectra:discuss`
- User wants to plan, propose, or design a change → `/spectra:propose`
- Tasks are ready to implement → `/spectra:apply`
- There's an in-progress change to continue → `/spectra:ingest`
- User asks about specs or how something works → `/spectra:ask`
- Implementation is done → `/spectra:archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra:apply` and `/spectra:ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# CLAUDE.md

## 語言規範

| 項目 | 語言 |
|------|------|
| Claude 回應 | 繁體中文 |
| 程式碼註釋 | 中文優先（通用函數可用英文） |
| 變數/函數命名 | 英文 |

## 核心開發原則

- **簡潔至上**：不添加未被要求的功能，修 Bug 不順便重構
- **可讀性優先**：程式碼要清晰而非聰明，複雜邏輯加中文註釋說明「為什麼」
- **最小化影響**：改動限制在最小範圍，避免波及其他模塊
- **低耦合**：模塊依賴越少越好，依賴方向只能由上往下

## :warning: 不捏造規則

- **絕不捏造** API、函式庫方法或設定選項
- **絕不猜測**語法或行為——先查詢再回答
- **使用 Context7 MCP** 獲取函式庫/框架的最新文件，無需我明確要求
- 無法確定時，明確說「我不知道，需要查詢文件」

需要驗證的警示用語（出現即代表在猜測）：

- :x:「我認為這個 API……」
- :x:「這應該可以運作……」
- :x:「通常這樣做……」

## 開發工作流程

1. **確認需求**：複述理解並確認，有疑問必須詢問
2. **任務規劃**：使用 TaskCreate 條列步驟
3. **開發完成**：執行 `npm run build` 驗證編譯
4. **發現問題**：主動告知不合理需求，而非自行解決

**Bug 修復**：分析相關 Bug 是否同一根本原因 → 批次處理 → 修復後 build 驗證
