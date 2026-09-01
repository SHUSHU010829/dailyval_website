// 藍勾勾的退回理由。
//
// **申請人看得到這些字**（social.my_badge_applications 有 review_note），所以它們
// 是對外文字，不是內部備註。code 才是要翻譯的東西：App 有 6 種語言，而 note 存的
// 是中文，A3 做藍勾勾畫面的時候照 code 給譯文，沒有 code 的舊資料才退回顯示 note。
//
// 這份清單必須跟 identity.badge_applications 的 badge_applications_reason_code_valid
// CHECK 一致。要增刪理由就是兩邊各改一行,刻意不做成線上可編輯的設定——六個字串
// 值得的是「改動看得見、有版本控制」。

export interface BadgeReason {
  code: string;
  /** 按鈕上的短標籤。 */
  label: string;
  /** 送出去、申請人會讀到的那句話。留空代表必須自己寫。 */
  note: string;
}

export const BADGE_REASONS: BadgeReason[] = [
  {
    code: "no_links",
    label: "沒有連結",
    note: "申請沒有附上可以查證的頻道或社群連結。補上之後歡迎再送一次。",
  },
  {
    code: "link_unreachable",
    label: "連結打不開",
    note: "附上的連結打不開，或是無法確認那個帳號是本人的。請確認連結有效再送一次。",
  },
  {
    code: "not_valorant",
    label: "與遊戲無關",
    note: "頻道的內容主要不是特戰英豪相關。",
  },
  {
    code: "audience_too_small",
    label: "規模未達標準",
    note: "目前的觀眾規模還沒有到認證的標準。之後成長了再送一次沒問題。",
  },
  {
    code: "inactive",
    label: "近期沒更新",
    note: "頻道近期沒有新的內容。恢復更新之後再送一次。",
  },
  {
    code: "impersonation",
    label: "疑似冒用身分",
    note: "無法確認申請人就是那個頻道的本人。",
  },
  {
    code: "other",
    label: "其他（自行填寫）",
    note: "",
  },
];
