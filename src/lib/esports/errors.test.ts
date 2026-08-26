import { describe, expect, it } from "vitest";
import { classifyError, isTerminal, type EsportsRatingError } from "./errors";

describe("classifyError", () => {
  it("伺服器錯誤字串逐一對應", () => {
    const cases: Array<[string, EsportsRatingError]> = [
      ["window_closed", "window_closed"],
      ["not_authenticated", "not_signed_in"],
      ["uid_mismatch", "uid_mismatch"],
      ["invalid_parent", "invalid_parent"],
      ["comment_not_found", "comment_not_found"],
      ["objectionable_content", "objectionable_content"],
      ["invalid_body", "invalid_body"],
      ["invalid_name", "invalid_name"],
      ["forbidden", "forbidden"],
      ["feature_disabled", "feature_disabled"],
      ["rate_limited", "rate_limited"],
    ];
    for (const [message, expected] of cases) {
      expect(classifyError({ message })).toBe(expected);
    }
  });

  it("42501（permission denied）視為未登入", () => {
    expect(classifyError({ message: "permission denied for function cast_match_vote", code: "42501" })).toBe(
      "not_signed_in"
    );
  });

  it("未知情況歸網路錯誤（可重試）", () => {
    expect(classifyError({ message: "something odd" })).toBe("network");
    expect(classifyError(null)).toBe("network");
    expect(classifyError(undefined)).toBe("network");
  });
});

describe("isTerminal", () => {
  it("terminal / retryable 的劃分與 iOS 一致", () => {
    const terminal: EsportsRatingError[] = [
      "window_closed", "not_signed_in", "uid_mismatch", "invalid_parent",
      "comment_not_found", "objectionable_content", "invalid_body",
      "invalid_name", "forbidden",
    ];
    const retryable: EsportsRatingError[] = ["feature_disabled", "rate_limited", "network"];
    for (const error of terminal) expect(isTerminal(error), error).toBe(true);
    for (const error of retryable) expect(isTerminal(error), error).toBe(false);
  });
});
