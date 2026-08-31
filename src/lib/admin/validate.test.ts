import { describe, expect, it } from "vitest";
import {
  BadInput,
  bool,
  oneOf,
  optionalTimestamp,
  reason,
  targetKind,
  uuid,
} from "./validate";

describe("uuid", () => {
  it("accepts a uuid and lowercases it", () => {
    expect(uuid("0A0A0A0A-0000-0000-0000-00000000000A", "id")).toBe(
      "0a0a0a0a-0000-0000-0000-00000000000a"
    );
  });

  it("rejects anything that is not one", () => {
    // 這些會被原封送進 rpc 的參數位置。擋在這裡是為了少一次往返，
    // 不是唯一的防線——資料庫那一側的型別才是。
    for (const bad of ["", "1", "not-a-uuid", null, undefined, 42, {}]) {
      expect(() => uuid(bad, "id")).toThrow(BadInput);
    }
  });
});

describe("reason", () => {
  it("is optional when the action is reversible", () => {
    expect(reason(undefined, { required: false })).toBeNull();
    expect(reason("   ", { required: false })).toBeNull();
  });

  it("is mandatory when it is not", () => {
    // 刪除與封禁都不可逆，所以空白理由要在按下去之前就被擋掉。
    expect(() => reason(undefined, { required: true })).toThrow(BadInput);
    expect(() => reason("   ", { required: true })).toThrow(BadInput);
  });

  it("trims and caps length", () => {
    expect(reason("  spam  ", { required: true })).toBe("spam");
    expect(() => reason("x".repeat(501), { required: true })).toThrow(BadInput);
  });
});

describe("optionalTimestamp", () => {
  it("treats absent as a permanent ban rather than an error", () => {
    expect(optionalTimestamp(undefined, "expires_at")).toBeNull();
    expect(optionalTimestamp("", "expires_at")).toBeNull();
  });

  it("refuses a date in the past", () => {
    // 一個已經過期的封禁在寫入的當下就失效了，看起來像「封了但沒效」。
    expect(() => optionalTimestamp("2000-01-01T00:00:00Z", "expires_at")).toThrow(BadInput);
  });

  it("normalises a future date to ISO", () => {
    const later = new Date(Date.now() + 86_400_000).toISOString();
    expect(optionalTimestamp(later, "expires_at")).toBe(later);
  });

  it("refuses nonsense", () => {
    expect(() => optionalTimestamp("next tuesday", "expires_at")).toThrow(BadInput);
  });
});

describe("the small ones", () => {
  it("targetKind only allows the two polymorphic targets", () => {
    expect(targetKind("post")).toBe("post");
    expect(targetKind("comment")).toBe("comment");
    expect(() => targetKind("user")).toThrow(BadInput);
  });

  it("bool does not coerce", () => {
    // "false" 是 truthy。強制轉型會讓「恢復」變成「下架」。
    expect(() => bool("false", "hidden")).toThrow(BadInput);
    expect(bool(false, "hidden")).toBe(false);
  });

  it("oneOf rejects values outside the list", () => {
    expect(oneOf("ban", ["ban", "lift"] as const, "action")).toBe("ban");
    expect(() => oneOf("delete", ["ban", "lift"] as const, "action")).toThrow(BadInput);
  });
});
