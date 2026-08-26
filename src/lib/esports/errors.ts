// 伺服器錯誤字串 → 錯誤分類（iOS EsportsRatingError 的對應）。
// 寫入 RPC 以 raise exception '<string>' 回報；字串就是契約。

export type EsportsRatingError =
  | "window_closed"
  | "not_signed_in"
  | "uid_mismatch"
  | "invalid_parent"
  | "comment_not_found"
  | "objectionable_content"
  | "invalid_body"
  | "invalid_name"
  | "forbidden"
  | "feature_disabled"
  | "rate_limited"
  | "network";

const SERVER_MESSAGES: Record<string, EsportsRatingError> = {
  window_closed: "window_closed",
  not_authenticated: "not_signed_in",
  uid_mismatch: "uid_mismatch",
  invalid_parent: "invalid_parent",
  comment_not_found: "comment_not_found",
  objectionable_content: "objectionable_content",
  invalid_body: "invalid_body",
  invalid_name: "invalid_name",
  forbidden: "forbidden",
  feature_disabled: "feature_disabled",
  rate_limited: "rate_limited",
};

/**
 * 分類 PostgREST 錯誤。42501（permission denied，例如 anon 打到
 * authenticated-only 的 RPC）視為未登入；其餘未知情況歸網路錯誤
 * （可重試，與 iOS 同）。
 */
export function classifyError(input: { message?: string; code?: string } | null | undefined): EsportsRatingError {
  if (input?.message) {
    const mapped = SERVER_MESSAGES[input.message.trim()];
    if (mapped) return mapped;
  }
  if (input?.code === "42501") return "not_signed_in";
  return "network";
}

/** terminal：重試也不會變好，要回滾樂觀狀態；retryable：保留意圖供重試 */
export function isTerminal(error: EsportsRatingError): boolean {
  switch (error) {
    case "feature_disabled":
    case "rate_limited":
    case "network":
      return false;
    default:
      return true;
  }
}
