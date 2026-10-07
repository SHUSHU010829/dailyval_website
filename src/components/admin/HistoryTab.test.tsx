// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionRow, BanRow } from "@/lib/admin/client";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  actions: vi.fn(),
  banLog: vi.fn(),
  ban: vi.fn(),
  banLegacy: vi.fn(),
  liftBan: vi.fn(),
  liftLegacyBan: vi.fn(),
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

import { BanHistory, ContentHistory } from "./AdminConsole";

const SKIN_KEY = "35bbbbbb-0000-4000-8000-0000000000b2";
const NATIVE = "aaaaaaaa-0000-4000-8000-000000000001";

function action(id: string, extra: Partial<ActionRow> = {}): ActionRow {
  return {
    action_id: id,
    action: "report:actioned",
    target_kind: "skin_comment",
    target_id: `t-${id}`,
    reason: "1 report(s) closed by the hide",
    created_at: "2026-10-07T00:00:00Z",
    total_actions: 2,
    admin_name: "Kris",
    subject_user_id: null,
    subject_name: null,
    subject_legacy_ck_user: null,
    content_exists: true,
    content_body: `留言 ${id}`,
    content_images: [],
    content_hidden: true,
    ...extra,
  };
}

function ban(id: string, extra: Partial<BanRow> = {}): BanRow {
  return {
    ban_id: id,
    user_id: null,
    display_name: "Skin Legacy",
    reason: "洗版",
    expires_at: null,
    created_at: "2026-10-07T00:00:00Z",
    created_by_name: "Kris",
    lifted_at: null,
    lifted_by_name: null,
    is_active: true,
    last_event_at: "2026-10-07T00:00:00Z",
    subject_deleted: false,
    total_bans: 1,
    legacy_key: SKIN_KEY,
    ...extra,
  };
}

const rowOf = (text: string) => screen.getByText(text).closest("li") as HTMLElement;

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(cleanup);

describe("ContentHistory", () => {
  it("names a legacy skin comment's author after the takedown and bans their key", async () => {
    const skinAuthor = {
      claimed: false,
      ck_user: null,
      puuid: SKIN_KEY,
      name: "Skin Legacy",
      tag_line: "SKN",
    };
    api.actions.mockResolvedValue([
      action("a1", {
        subject: skinAuthor,
        subject_status: { ban_key: SKIN_KEY, banned: false, ban_reason: null, accounts: [] },
      }),
      action("a2", {
        action: "hide",
        subject: skinAuthor,
        subject_status: { ban_key: SKIN_KEY, banned: false, ban_reason: null, accounts: [] },
      }),
    ]);
    api.banLegacy.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("洗版");
    render(<ContentHistory />);
    await screen.findByText("留言 a1");

    expect(screen.getAllByText("Skin Legacy")).toHaveLength(2);
    expect(screen.queryByText("（未記錄）")).toBeNull();

    const [first] = screen.getAllByRole("button", { name: "永久封禁作者" });
    fireEvent.click(first);
    await waitFor(() => expect(api.banLegacy).toHaveBeenCalledWith(SKIN_KEY, "洗版"));
    // 同一個作者的兩列一起顯示封禁中。
    await waitFor(() => expect(screen.getAllByText("· 封禁中")).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "永久封禁作者" })).toBeNull();
  });

  it("bans a claimed subject by account and shows a ban the server already has", async () => {
    api.actions.mockResolvedValue([
      action("a1", {
        subject_user_id: NATIVE,
        subject_name: "Native A",
        subject: { claimed: true, user_id: NATIVE, name: "Native A" },
        subject_status: { ban_key: null, banned: false, ban_reason: null, accounts: [] },
      }),
      action("a2", {
        subject: { claimed: false, ck_user: "_old", name: "Old One" },
        subject_status: { ban_key: "_old", banned: true, ban_reason: "spam", accounts: [] },
      }),
    ]);
    api.ban.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("spam");
    render(<ContentHistory />);
    await screen.findByText("留言 a1");

    expect(rowOf("留言 a2").textContent).toContain("封禁中");
    fireEvent.click(screen.getByRole("button", { name: "永久封禁作者" }));
    await waitFor(() => expect(api.ban).toHaveBeenCalledWith(NATIVE, "spam", null));
    expect(api.banLegacy).not.toHaveBeenCalled();
  });

  it("falls back to the old line when the database has no subject yet", async () => {
    api.actions.mockResolvedValue([
      action("a1", { subject_legacy_ck_user: "_old" }),
      action("a2"),
    ]);
    render(<ContentHistory />);
    await screen.findByText("留言 a1");
    expect(rowOf("留言 a1").textContent).toContain("尚未認領的舊帳號");
    expect(rowOf("留言 a2").textContent).toContain("（未記錄）");
    expect(screen.queryByRole("button", { name: /封禁/ })).toBeNull();
  });
});

describe("BanHistory", () => {
  it("labels a legacy-key ban and lifts it by key", async () => {
    api.banLog.mockResolvedValueOnce([ban("b1")]);
    api.banLog.mockResolvedValueOnce([
      ban("b1", { is_active: false, lifted_at: "2026-10-07T01:00:00Z", lifted_by_name: "Kris" }),
    ]);
    api.liftLegacyBan.mockResolvedValue({ ok: true, lifted: 1 });
    render(<BanHistory />);
    await screen.findByText("Skin Legacy");
    expect(screen.getByText("· 舊版身分（尚未認領）")).toBeTruthy();
    expect(screen.getByText("封禁中")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "解除封禁" }));
    await waitFor(() => expect(api.liftLegacyBan).toHaveBeenCalledWith(SKIN_KEY));
    expect(api.liftBan).not.toHaveBeenCalled();
    await screen.findByText("已解除");
    expect(screen.queryByRole("button", { name: "解除封禁" })).toBeNull();
  });

  it("lifts an account ban by account, even when it started on a legacy key", async () => {
    api.banLog.mockResolvedValue([ban("b1", { user_id: NATIVE, display_name: "Claimer" })]);
    api.liftBan.mockResolvedValue({ ok: true, lifted: 1 });
    render(<BanHistory />);
    await screen.findByText("Claimer");
    expect(screen.queryByText("· 舊版身分（尚未認領）")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "解除封禁" }));
    await waitFor(() => expect(api.liftBan).toHaveBeenCalledWith(NATIVE));
    expect(api.liftLegacyBan).not.toHaveBeenCalled();
  });
});
