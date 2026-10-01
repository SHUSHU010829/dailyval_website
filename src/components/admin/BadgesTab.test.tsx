// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BadgeQuery, BadgeRow } from "@/lib/admin/client";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  badges: vi.fn(),
  rejectionReasons: vi.fn(),
}));

vi.mock("@/lib/admin/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/admin/client")>();
  return { ...real, admin: { ...real.admin, ...api } };
});

// 這些測試不登入。擋掉 supabase-js，免得它在 import 時去摸 localStorage。
vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => {
    throw new Error("not in tests");
  },
}));

import { BadgesTab } from "./AdminConsole";

// 伺服器上的三份待審申請，照送出時間由舊到新。
const APPLICANTS = ["早", "中", "晚"];

function row(nickname: string, i: number): BadgeRow {
  return {
    application_id: `00000000-0000-4000-8000-00000000000${i}`,
    user_id: null,
    legacy_ck_user: `_ck${i}`,
    display_name: null,
    is_verified: false,
    nickname,
    links: [],
    intro: null,
    more_info: null,
    status: "pending",
    review_note: null,
    created_at: `2026-09-0${i + 1}T00:00:00Z`,
    reviewed_at: null,
    application_count: 1,
    total_applicants: APPLICANTS.length,
  };
}

function serve({ offset = 0, sort = "oldest" }: BadgeQuery = {}): BadgeRow[] {
  const rows = APPLICANTS.map(row);
  return (sort === "newest" ? rows.reverse() : rows).slice(offset);
}

const shown = () => screen.getAllByRole("strong").map((el) => el.textContent);
const sortButton = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  api.badges.mockImplementation(async (q: BadgeQuery) => serve(q));
  api.rejectionReasons.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BadgesTab sort", () => {
  it("starts oldest first, the order the queue always had", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中", "晚"]));
    expect(api.badges).toHaveBeenLastCalledWith({ status: "pending", offset: 0, sort: "oldest" });
    expect(sortButton("最舊申請").getAttribute("aria-pressed")).toBe("true");
    expect(sortButton("最新申請").getAttribute("aria-pressed")).toBe("false");
  });

  it("reloads from the first page newest first when 最新申請 is picked", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中", "晚"]));

    fireEvent.click(sortButton("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["晚", "中", "早"]));
    expect(api.badges).toHaveBeenLastCalledWith({ status: "pending", offset: 0, sort: "newest" });
    expect(sortButton("最新申請").getAttribute("aria-pressed")).toBe("true");

    // 換狀態時排序留著。
    fireEvent.click(screen.getByRole("button", { name: "全部" }));
    await waitFor(() =>
      expect(api.badges).toHaveBeenLastCalledWith({ status: "all", offset: 0, sort: "newest" })
    );
  });
});
