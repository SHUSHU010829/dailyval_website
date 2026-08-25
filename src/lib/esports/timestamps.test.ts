import { describe, expect, it } from "vitest";
import { parsePostgresTimestamp, timestampQueryValue } from "./timestamps";

describe("parsePostgresTimestamp", () => {
  it("解析不定長度的小數位", () => {
    expect(parsePostgresTimestamp("2026-08-07T12:34:56.78901+00:00")).toBe(
      Date.parse("2026-08-07T12:34:56.789Z")
    );
    expect(parsePostgresTimestamp("2026-08-07T12:34:56.7+00:00")).toBe(
      Date.parse("2026-08-07T12:34:56.700Z")
    );
  });

  it("無小數與 Z 結尾都接受", () => {
    expect(parsePostgresTimestamp("2026-08-07T12:34:56+00:00")).toBe(
      Date.parse("2026-08-07T12:34:56Z")
    );
    expect(parsePostgresTimestamp("2026-08-07T12:34:56Z")).toBe(
      Date.parse("2026-08-07T12:34:56Z")
    );
  });

  it("垃圾輸入回 null，不丟例外", () => {
    expect(parsePostgresTimestamp("not a date")).toBeNull();
    expect(parsePostgresTimestamp("")).toBeNull();
  });
});

describe("timestampQueryValue", () => {
  it("只把 +00:00 換成 Z，其他不動", () => {
    expect(timestampQueryValue("2026-08-07T12:34:56.78901+00:00")).toBe(
      "2026-08-07T12:34:56.78901Z"
    );
    expect(timestampQueryValue("2026-08-07T12:34:56Z")).toBe("2026-08-07T12:34:56Z");
  });
});
