// 退回理由的形狀。**清單本身住在資料庫**
// （identity.badge_rejection_reasons），因為 note 是申請人會讀到的那一句，而
// 那句話由伺服器決定才算數：如果它是瀏覽器送上去的，「固定選項」保證的就只是
// 「這一個分頁送出一致的字」,一個舊分頁或改過的請求照樣能配一個合法代碼送
// 任意句子進來。
//
// 所以後台是**拿**這份清單來畫按鈕，不是自己帶一份。按鈕上寫的和存下來的因此
// 一定是同一份資料。

export interface BadgeReason {
  code: string;
  /** 按鈕上的短標籤。 */
  label: string;
  /** 申請人會讀到的那一句。needs_own_words 時為 null。 */
  note: string | null;
  /** 這一種必須自己寫（也就是「其他」）。 */
  needs_own_words: boolean;
}
