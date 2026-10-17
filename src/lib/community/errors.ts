// 伺服器錯誤字串 → 錯誤分類（iOS SocialServiceError 的對應）。
// 寫入 RPC 以 raise exception '<string>' 回報；字串就是契約。

export type SocialErrorKind =
  | "not_signed_in"
  | "banned"
  | "feature_disabled"
  | "rate_limited"
  | "objectionable_content"
  | "invalid_body"
  | "too_many_images"
  | "invalid_image"
  | "post_not_found"
  | "comment_not_found"
  | "forbidden"
  | "invalid_target"
  | "network"
  | "unknown";

const SERVER_MESSAGES: Record<string, SocialErrorKind> = {
  not_authenticated: "not_signed_in",
  uid_mismatch: "not_signed_in",
  user_banned: "banned",
  feature_disabled: "feature_disabled",
  rate_limited: "rate_limited",
  objectionable_content: "objectionable_content",
  invalid_body: "invalid_body",
  too_many_images: "too_many_images",
  invalid_image: "invalid_image",
  post_not_found: "post_not_found",
  comment_not_found: "comment_not_found",
  forbidden: "forbidden",
  invalid_target: "invalid_target",
  invalid_reaction: "invalid_target",
};

export class SocialServiceError extends Error {
  readonly kind: SocialErrorKind;

  constructor(kind: SocialErrorKind, detail?: string) {
    super(detail ?? kind);
    this.name = "SocialServiceError";
    this.kind = kind;
  }
}

/**
 * 分類 PostgREST / supabase-js 丟出來的東西。
 * 42501（permission denied：anon 打到 authenticated-only 的 RPC）視為未登入；
 * 其餘認不得的一律歸網路錯誤（可重試，與 iOS 同）。
 */
export function classifyError(error: unknown): SocialServiceError {
  if (error instanceof SocialServiceError) return error;

  const input =
    error && typeof error === "object"
      ? (error as { message?: unknown; code?: unknown; name?: unknown })
      : null;
  const message =
    typeof input?.message === "string" ? input.message.trim() : "";
  const mapped = SERVER_MESSAGES[message];
  if (mapped) return new SocialServiceError(mapped, message);
  if (input?.code === "42501")
    return new SocialServiceError("not_signed_in", message);
  // id_taken：uuid 不會意外撞到，這代表 bug 或竄改過的客戶端，留原字串進 log
  if (message === "id_taken") return new SocialServiceError("unknown", message);
  if (input?.name === "AuthError" || input?.name === "AuthApiError") {
    return new SocialServiceError("not_signed_in", message);
  }
  return new SocialServiceError("network", message || undefined);
}

/** terminal：重試也不會變好，要回滾樂觀狀態；其餘保留意圖供重試 */
export function isTerminal(kind: SocialErrorKind): boolean {
  switch (kind) {
    case "feature_disabled":
    case "rate_limited":
    case "network":
      return false;
    default:
      return true;
  }
}
