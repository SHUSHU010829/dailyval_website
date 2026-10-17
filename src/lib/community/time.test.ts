import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/community/time";

const NOW = Date.parse("2026-09-10T12:00:00Z");

describe("lib/community/time", () => {
  it("returns an empty string for missing or unparsable input", () => {
    expect(formatRelativeTime(null, "en", NOW)).toBe("");
    expect(formatRelativeTime("not a date", "en", NOW)).toBe("");
  });

  it("formats seconds, minutes, hours and days relatively", () => {
    expect(formatRelativeTime("2026-09-10T11:59:50+00:00", "en", NOW)).toBe(
      "now",
    );
    expect(formatRelativeTime("2026-09-10T11:55:00+00:00", "en", NOW)).toBe(
      "5 minutes ago",
    );
    expect(formatRelativeTime("2026-09-10T09:00:00+00:00", "en", NOW)).toBe(
      "3 hours ago",
    );
    expect(formatRelativeTime("2026-09-08T12:00:00+00:00", "en", NOW)).toBe(
      "2 days ago",
    );
  });

  it("accepts PostgREST timestamps with long fractions", () => {
    expect(
      formatRelativeTime("2026-09-10T11:54:59.123456+00:00", "en", NOW),
    ).toBe("5 minutes ago");
  });

  it("switches to an absolute date after a week", () => {
    const text = formatRelativeTime("2026-08-01T12:00:00+00:00", "en", NOW);
    expect(text).not.toMatch(/ago/);
    expect(text.length).toBeGreaterThan(0);
  });
});
