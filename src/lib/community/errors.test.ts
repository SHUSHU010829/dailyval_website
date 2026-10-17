// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  classifyError,
  isTerminal,
  SocialServiceError,
} from "@/lib/community/errors";

describe("lib/community/errors", () => {
  it("maps the server error strings to kinds", () => {
    expect(classifyError({ message: "not_authenticated" }).kind).toBe(
      "not_signed_in",
    );
    expect(classifyError({ message: "uid_mismatch" }).kind).toBe(
      "not_signed_in",
    );
    expect(classifyError({ message: "user_banned" }).kind).toBe("banned");
    expect(classifyError({ message: "feature_disabled" }).kind).toBe(
      "feature_disabled",
    );
    expect(classifyError({ message: "rate_limited" }).kind).toBe(
      "rate_limited",
    );
    expect(classifyError({ message: "objectionable_content" }).kind).toBe(
      "objectionable_content",
    );
    expect(classifyError({ message: "invalid_body" }).kind).toBe(
      "invalid_body",
    );
    expect(classifyError({ message: "too_many_images" }).kind).toBe(
      "too_many_images",
    );
    expect(classifyError({ message: "invalid_image" }).kind).toBe(
      "invalid_image",
    );
    expect(classifyError({ message: "post_not_found" }).kind).toBe(
      "post_not_found",
    );
    expect(classifyError({ message: "comment_not_found" }).kind).toBe(
      "comment_not_found",
    );
    expect(classifyError({ message: "forbidden" }).kind).toBe("forbidden");
    expect(classifyError({ message: "invalid_target" }).kind).toBe(
      "invalid_target",
    );
    expect(classifyError({ message: "invalid_reaction" }).kind).toBe(
      "invalid_target",
    );
  });

  it("treats 42501 (permission denied) as not signed in", () => {
    expect(
      classifyError({
        message: "permission denied for function my_blocks",
        code: "42501",
      }).kind,
    ).toBe("not_signed_in");
  });

  it("treats supabase auth errors as not signed in", () => {
    const error = Object.assign(new Error("Invalid login credentials"), {
      name: "AuthApiError",
    });
    expect(classifyError(error).kind).toBe("not_signed_in");
  });

  it("keeps id_taken as unknown so it reads as a bug in logs", () => {
    const error = classifyError({ message: "id_taken" });
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("id_taken");
  });

  it("falls back to network for anything it cannot classify", () => {
    expect(classifyError(new TypeError("Failed to fetch")).kind).toBe(
      "network",
    );
    expect(classifyError(null).kind).toBe("network");
    expect(classifyError("boom").kind).toBe("network");
  });

  it("passes an existing SocialServiceError through untouched", () => {
    const error = new SocialServiceError("forbidden");
    expect(classifyError(error)).toBe(error);
  });

  it("knows which kinds are worth retrying", () => {
    expect(isTerminal("network")).toBe(false);
    expect(isTerminal("rate_limited")).toBe(false);
    expect(isTerminal("feature_disabled")).toBe(false);
    expect(isTerminal("forbidden")).toBe(true);
    expect(isTerminal("objectionable_content")).toBe(true);
  });
});
