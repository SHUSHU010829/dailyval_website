// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserDetail } from "@/lib/admin/client";
import type { PersonHit, PremiumDetail } from "@/lib/admin/premium";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  search: vi.fn(),
  person: vi.fn(),
  premium: vi.fn(),
  grantPremium: vi.fn(),
  revokePremium: vi.fn(),
  refreshPremium: vi.fn(),
}));

vi.mock("@/lib/admin/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/admin/client")>();
  return { ...real, admin: { ...real.admin, ...api } };
});

vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => {
    throw new Error("not in tests");
  },
}));

import { AdminRequestError } from "@/lib/admin/client";
import { UserTab } from "./AdminConsole";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";

function hit(id: string, name: string, tag: string, extra: Partial<PersonHit> = {}): PersonHit {
  return {
    user_id: id,
    display_name: `${name}#${tag}`,
    game_name: name,
    tag_line: tag,
    riot_puuid: null,
    rank_tier: null,
    is_verified: false,
    premium_active: false,
    premium_expires_at: null,
    banned: false,
    created_at: "2026-10-01T00:00:00+00:00",
    matched: "name",
    ...extra,
  };
}

function person(id: string, name: string, premium = false): UserDetail {
  return {
    user_id: id,
    legacy_ck_user: null,
    claimed: true,
    display_name: name,
    is_verified: false,
    is_premium: premium,
    banned: false,
    ban_reason: null,
    ban_expires_at: null,
    posts: 0,
    comments: 0,
    hidden_content: 0,
    reports_against: 0,
    actions_against: 0,
    identities: [],
  };
}

const noPremium: PremiumDetail = { active: false, membership: null, grants: [] };

function search(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/遊戲名稱/), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "查詢" }));
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.premium.mockResolvedValue(noPremium);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UserTab", () => {
  it("opens the only result straight away and shows its premium state", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    api.premium.mockResolvedValue({
      active: true,
      membership: {
        active: true,
        expires_at: "2026-11-05T00:00:00+00:00",
        observed_at: "2026-10-05T00:00:00+00:00",
        checked_at: "2026-10-05T00:00:00+00:00",
      },
      grants: [],
    } satisfies PremiumDetail);
    render(<UserTab />);
    search("kris#tw1");

    await screen.findByText(/有效，到期/);
    expect(api.search).toHaveBeenCalledWith("kris#tw1");
    expect(api.person).toHaveBeenCalledWith({ userId: A });
    expect(api.premium).toHaveBeenCalledWith(A);
  });

  it("lists several results and opens the one clicked", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1"), hit(B, "Kris", "JP2")]);
    api.person.mockResolvedValue(person(B, "Kris#JP2"));
    render(<UserTab />);
    search("Kris");

    await screen.findByText("#JP2");
    expect(api.person).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("#JP2"));
    await screen.findByText(B);
    expect(api.person).toHaveBeenCalledWith({ userId: B });
  });

  it("says plainly that people who never signed in cannot be found", async () => {
    api.search.mockResolvedValue([]);
    render(<UserTab />);
    search("Nobody");
    await screen.findByText(/找不到/);
  });

  it("opens a CloudKit identity without searching, and offers no premium for it", async () => {
    api.person.mockResolvedValue({ ...person(A, "x"), user_id: null, claimed: false, legacy_ck_user: "_abc" });
    render(<UserTab />);
    search("_abc");
    await screen.findByText(/尚未認領/);
    expect(api.search).not.toHaveBeenCalled();
    expect(api.person).toHaveBeenCalledWith({ legacyCkUser: "_abc" });
    expect(api.premium).not.toHaveBeenCalled();
  });

  it("a slow earlier search never replaces a later one", async () => {
    let slow!: (v: PersonHit[]) => void;
    api.search
      .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
      .mockResolvedValueOnce([hit(B, "Second", "B2")]);
    api.person.mockResolvedValue(person(B, "Second#B2"));
    render(<UserTab />);
    search("First");
    search("Second");
    await screen.findByText(B);
    await act(async () => slow([hit(A, "First", "A1")]));
    expect(screen.queryByText("First")).toBeNull();
    expect(api.person).toHaveBeenCalledTimes(1);
  });

  it("grants the chosen duration with the reason, then reloads the card and the person", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    api.grantPremium.mockResolvedValue({
      ok: true,
      ends_at: "2027-10-05T00:00:00+00:00",
      new_customer: true,
      synced: true,
      active: true,
      expires_at: "2027-10-05T00:00:00.000Z",
    });
    render(<UserTab />);
    search("Kris#TW1");
    await screen.findByText(/· 沒有/);

    // 沒寫理由不送。
    fireEvent.click(screen.getByRole("button", { name: "1 年" }));
    fireEvent.click(screen.getByRole("button", { name: "送 1 年" }));
    await screen.findByText(/要寫理由/);
    expect(api.grantPremium).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "活動獎勵" } });
    fireEvent.click(screen.getByRole("button", { name: "送 1 年" }));
    await screen.findByText(/已送出。RevenueCat 現在/);
    expect(screen.getByText(/對方登入後就會生效/)).toBeTruthy();
    expect(window.confirm).toHaveBeenCalledWith("送 1 年 Premium 給 Kris#TW1？");
    expect(api.grantPremium).toHaveBeenCalledWith(A, "one_year", "活動獎勵");
    await waitFor(() => expect(api.premium).toHaveBeenCalledTimes(2));
    expect(api.person).toHaveBeenCalledTimes(2);
    // 卡片沒有被拆掉重建：結果訊息還在。
    expect(screen.getByText(/已送出。RevenueCat 現在/)).toBeTruthy();
  });

  it("does nothing when the confirmation is declined", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    render(<UserTab />);
    search("Kris#TW1");
    await screen.findByText(/· 沒有/);
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "收回" }));
    expect(api.revokePremium).not.toHaveBeenCalled();
  });

  it("shows RevenueCat's refusal and still reloads the history", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    api.revokePremium.mockRejectedValue(
      new AdminRequestError("RevenueCat 拒絕了這次變更（HTTP 404），什麼都沒有改。", 502)
    );
    render(<UserTab />);
    search("Kris#TW1");
    await screen.findByText(/· 沒有/);
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "誤送" } });
    fireEvent.click(screen.getByRole("button", { name: "收回" }));
    await screen.findByText(/HTTP 404/);
    expect(api.revokePremium).toHaveBeenCalledWith(A, "誤送");
    await waitFor(() => expect(api.premium).toHaveBeenCalledTimes(2));
  });
});

describe("UserTab while a change is in flight", () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  }
  const done = { ok: true, ends_at: null, new_customer: false, synced: true, active: true, expires_at: null };

  it("a grant for A finishing after B was opened never brings A back", async () => {
    api.search.mockResolvedValue([hit(A, "Alpha", "A1"), hit(B, "Bravo", "B2")]);
    api.person.mockImplementation(async ({ userId }: { userId: string }) =>
      userId === A ? person(A, "Alpha#A1") : person(B, "Bravo#B2")
    );
    const grant = deferred<typeof done>();
    api.grantPremium.mockReturnValue(grant.promise);
    render(<UserTab />);
    search("a");
    fireEvent.click(await screen.findByText("Alpha"));
    await screen.findByText(A);
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /^送 / }));
    await waitFor(() => expect(api.grantPremium).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Bravo"));
    await screen.findByText(B);
    await act(async () => grant.resolve(done));
    await act(async () => {});
    expect(screen.queryByText(A)).toBeNull();
    expect(screen.getByText(B)).toBeTruthy();
    expect(api.person).toHaveBeenCalledTimes(2);
  });

  it("clicking the open person again keeps the in-flight lock", async () => {
    api.search.mockResolvedValue([hit(A, "Alpha", "A1"), hit(B, "Bravo", "B2")]);
    api.person.mockResolvedValue(person(A, "Alpha#A1"));
    const grant = deferred<typeof done>();
    api.grantPremium.mockReturnValue(grant.promise);
    render(<UserTab />);
    search("a");
    fireEvent.click(await screen.findByText("Alpha"));
    await screen.findByText(A);
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /^送 / }));
    await screen.findByRole("button", { name: "處理中…" });

    fireEvent.click(screen.getByText("Alpha"));
    await act(async () => {});
    expect((screen.getByRole("button", { name: "收回" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => grant.resolve(done));
  });

  it("a CloudKit lookup clears a pending search's indicator", async () => {
    api.search.mockReturnValue(new Promise(() => {}));
    api.person.mockResolvedValue({ ...person(A, "x"), user_id: null, claimed: false, legacy_ck_user: "_abc" });
    render(<UserTab />);
    search("Slow");
    await screen.findByText("查詢中…");
    search("_abc");
    await screen.findByText(/尚未認領/);
    expect(screen.queryByText("查詢中…")).toBeNull();
  });

  it("re-reads RevenueCat on request without a reason or a confirmation", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    api.refreshPremium.mockResolvedValue({ ...done, active: false });
    render(<UserTab />);
    search("Kris#TW1");
    await screen.findByText(/· 沒有/);
    fireEvent.click(screen.getByRole("button", { name: "向 RevenueCat 重新確認" }));
    await screen.findByText("RevenueCat 現在：沒有 Premium。");
    expect(api.refreshPremium).toHaveBeenCalledWith(A);
    expect(window.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(api.premium).toHaveBeenCalledTimes(2));
  });
});

describe("UserTab ordering of re-reads and unsettled results", () => {
  it("a slow earlier re-read of the same person never overwrites a newer one", async () => {
    api.search.mockResolvedValue([hit(A, "Alpha", "A1")]);
    let slow!: (d: UserDetail) => void;
    api.person
      .mockResolvedValueOnce(person(A, "Alpha#A1"))
      // 再點一次：很慢的重讀
      .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
      // 送完之後的重讀：已經是 Premium
      .mockResolvedValueOnce(person(A, "Alpha#A1", true));
    api.grantPremium.mockResolvedValue({
      ok: true, ends_at: null, new_customer: false, synced: true, active: true, expires_at: null,
    });
    render(<UserTab />);
    search("Alpha");
    await screen.findByText(A);
    fireEvent.click(screen.getByText("Alpha"));
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /^送 / }));
    await screen.findByText(/已送出/);
    await waitFor(() => expect(api.person).toHaveBeenCalledTimes(3));
    await screen.findByText("· Premium");
    await act(async () => slow(person(A, "Alpha#A1", false)));
    expect(screen.getByText("· Premium")).toBeTruthy();
  });

  it("an unsettled grant shows what the re-read found, in the browser's own words", async () => {
    api.search.mockResolvedValue([hit(A, "Kris", "TW1")]);
    api.person.mockResolvedValue(person(A, "Kris#TW1"));
    api.grantPremium.mockRejectedValue(
      new AdminRequestError("fallback", 504, {
        error: "fallback",
        active: true,
        expires_at: "2026-11-05T00:00:00.000Z",
        synced: false,
      })
    );
    render(<UserTab />);
    search("Kris#TW1");
    await screen.findByText(/· 沒有/);
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /^送 / }));
    await screen.findByText(/剛剛重查：RevenueCat 上是有效的/);
    expect(screen.getByText(/下面卡片上的狀態還沒更新/)).toBeTruthy();
    expect(screen.queryByText("fallback")).toBeNull();
  });
});
