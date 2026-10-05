import { describe, expect, it } from "vitest";
import { durationLabel, PREMIUM_DURATIONS, premiumChange, premiumResult } from "./premium";
import { BadInput } from "./validate";

const user = "bbbbbbbb-0000-4000-8000-000000000002";

describe("premiumChange", () => {
  it("accepts a grant with a known duration, lowercases the id and trims the reason", () => {
    expect(
      premiumChange({ action: "grant", user_id: user.toUpperCase(), duration: "one_month", reason: "  活動獎勵 " })
    ).toEqual({ action: "grant", user_id: user, duration: "one_month", reason: "活動獎勵" });
  });

  it("sends a revoke with an explicit null duration", () => {
    expect(premiumChange({ action: "revoke", user_id: user, reason: "誤送" })).toEqual({
      action: "revoke",
      user_id: user,
      duration: null,
      reason: "誤送",
    });
  });

  it.each([
    [{ action: "gift", user_id: user, duration: "one_month", reason: "x" }],
    [{ action: "grant", user_id: "nope", duration: "one_month", reason: "x" }],
    [{ action: "grant", user_id: user, duration: "forever", reason: "x" }],
    [{ action: "grant", user_id: user, reason: "x" }],
    [{ action: "grant", user_id: user, duration: "one_month", reason: "   " }],
    [{ action: "grant", user_id: user, duration: "one_month" }],
    [{ action: "grant", user_id: user, duration: "one_month", reason: "x".repeat(501) }],
    [{ action: "revoke", user_id: user, duration: "one_week", reason: "x" }],
  ])("refuses %j", (body) => {
    expect(() => premiumChange(body)).toThrow(BadInput);
  });

  it("offers exactly the durations the database accepts", () => {
    // identity.premium_grants 的 CHECK（20261005150000_admin_premium_grants.sql）。
    expect(PREMIUM_DURATIONS.map(([key]) => key)).toEqual([
      "one_week",
      "one_month",
      "three_months",
      "six_months",
      "one_year",
      "lifetime",
    ]);
    expect(durationLabel("lifetime")).toBe("永久");
    expect(durationLabel(null)).toBe("");
  });
});

describe("premiumResult", () => {
  it("passes a success through with only the fields the console needs", () => {
    expect(
      premiumResult(200, { ok: true, grant_id: "g", ends_at: "2026-11-05T00:00:00Z", synced: true })
    ).toEqual({ status: 200, body: { ok: true, ends_at: "2026-11-05T00:00:00Z", synced: true } });
    expect(premiumResult(200, { ok: true, ends_at: null, synced: false }).body).toEqual({
      ok: true,
      ends_at: null,
      synced: false,
    });
  });

  it("shows the database's validation message as is", () => {
    expect(premiumResult(400, { error: "no such user x" })).toEqual({
      status: 400,
      body: { error: "no such user x" },
    });
  });

  it("says whether RevenueCat changed anything", () => {
    const rejected = premiumResult(502, { error: "revenuecat_rejected", status: 404 });
    expect(rejected.status).toBe(502);
    expect(rejected.body.error).toContain("HTTP 404");
    expect(rejected.body.error).toContain("什麼都沒有改");
    const unknown = premiumResult(504, { error: "revenuecat_unreachable" });
    expect(unknown.status).toBe(504);
    expect(unknown.body.error).toContain("不確定有沒有生效");
  });

  it("never forwards anything else", () => {
    for (const [status, body] of [
      [404, { error: "not_found" }],
      [503, { error: "unavailable" }],
      [500, { error: "secret internals" }],
      [200, { ok: false }],
      [502, null],
    ] as const) {
      expect(premiumResult(status, body)).toEqual({ status: 500, body: { error: "server_error" } });
    }
  });
});
