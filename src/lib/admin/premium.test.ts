import { describe, expect, it } from "vitest";
import {
  changeMessage,
  durationLabel,
  expiryLabel,
  PREMIUM_DURATIONS,
  premiumChange,
  premiumResult,
  type PremiumChangeResult,
} from "./premium";
import { BadInput } from "./validate";

const user = "bbbbbbbb-0000-4000-8000-000000000002";

describe("premiumChange", () => {
  it("accepts a grant with a known duration, lowercases the id and trims the reason", () => {
    expect(
      premiumChange({ action: "grant", user_id: user.toUpperCase(), duration: "one_month", reason: "  活動獎勵 " })
    ).toEqual({ action: "grant", user_id: user, duration: "one_month", reason: "活動獎勵" });
  });

  it("takes a refresh with nothing but the person", () => {
    expect(premiumChange({ action: "refresh", user_id: user, reason: "ignored" })).toEqual({
      action: "refresh",
      user_id: user,
    });
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
      premiumResult(200, {
        ok: true,
        grant_id: "g",
        ends_at: "2026-11-05T00:00:00Z",
        new_customer: true,
        synced: true,
        active: true,
        expires_at: "2026-11-05T00:00:00.000Z",
      })
    ).toEqual({
      status: 200,
      body: {
        ok: true,
        ends_at: "2026-11-05T00:00:00Z",
        new_customer: true,
        synced: true,
        active: true,
        expires_at: "2026-11-05T00:00:00.000Z",
      },
    });
    expect(premiumResult(200, { ok: true, ends_at: null, synced: false }).body).toEqual({
      ok: true,
      ends_at: null,
      new_customer: false,
      synced: false,
      active: null,
      expires_at: null,
    });
  });

  it("says another change is still in flight", () => {
    const r = premiumResult(409, { error: "in_progress" });
    expect(r.status).toBe(409);
    expect(r.body.error).toContain("還有一件 Premium 變更在處理中");
  });

  it("says when there was nothing to revoke", () => {
    const r = premiumResult(409, { error: "nothing_to_revoke" });
    expect(r.status).toBe(409);
    expect(r.body.error).toContain("沒有贈送的 Premium 可以收回");
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
    expect(premiumResult(502, { error: "revenuecat_rejected", status: 0 }).body.error).toBe(
      "連不上 RevenueCat，什麼都還沒送出。"
    );
    const unknown = premiumResult(504, { error: "revenuecat_unreachable" });
    expect(unknown.status).toBe(504);
    expect(unknown.body.error).toContain("不確定這次有沒有生效");
    expect(unknown.body.error).toContain("重新確認");
    // 重查到的狀態跟著說，讓管理員不必靠快取的卡片判斷要不要重送。
    expect(premiumResult(504, { error: "revenuecat_unreachable", active: true }).body.error).toContain(
      "RevenueCat 上是有效的"
    );
    expect(premiumResult(504, { error: "revenuecat_unreachable", active: false }).body.error).toContain(
      "可以再送一次"
    );
    expect(premiumResult(502, { error: "revenuecat_lookup_failed" }).body.error).toContain("查不到");
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

describe("expiryLabel", () => {
  const now = Date.parse("2026-10-05T00:00:00Z");
  it("treats null and RevenueCat's two-hundred-year lifetime as lifetime", () => {
    expect(expiryLabel(null, now)).toBe("永久");
    expect(expiryLabel("2226-08-18T15:15:27Z", now)).toBe("永久");
  });
  it("shows a real date otherwise", () => {
    expect(expiryLabel("2026-11-05T00:00:00Z", now)).toBe(new Date("2026-11-05T00:00:00Z").toLocaleString());
  });
});

describe("changeMessage", () => {
  const base: PremiumChangeResult = {
    ok: true,
    ends_at: null,
    new_customer: false,
    synced: true,
    active: true,
    expires_at: "2226-08-18T15:15:27Z",
  };
  it("reports what RevenueCat holds now", () => {
    expect(changeMessage("grant", base)).toBe("已送出。RevenueCat 現在：有效，到期 永久。");
    expect(changeMessage("refresh", { ...base, active: false, expires_at: null })).toBe(
      "RevenueCat 現在：沒有 Premium。"
    );
  });
  it("warns when the person has never signed in on the new app", () => {
    expect(changeMessage("grant", { ...base, new_customer: true })).toContain("對方登入後就會生效");
  });
  it("says a revoke left a paid subscription in place", () => {
    expect(changeMessage("revoke", base)).toContain("對方還有其他有效的 Premium");
    expect(changeMessage("revoke", { ...base, active: false })).toBe("已收回贈送的 Premium。");
  });
  it("says the badge catches up later whenever the database write did not happen", () => {
    expect(changeMessage("grant", { ...base, synced: false, active: null, expires_at: null })).toBe(
      "已送出。查不到 RevenueCat 現在的狀態。金勾稍後更新。"
    );
    // RevenueCat 查到了，但沒寫進資料庫：一樣要說。
    expect(changeMessage("grant", { ...base, synced: false })).toContain("金勾稍後更新");
  });
});
