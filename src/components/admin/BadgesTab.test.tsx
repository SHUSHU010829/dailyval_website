// @vitest-environment jsdom
import { StrictMode } from "react";
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

// 伺服器那一側：申請照送出時間由舊到新，一頁 PAGE 列。as_of 是微秒精度的
// 字串，跟資料庫回來的一樣，用來確認後台原字串帶回去而不是經過 Date。
const PAGE = 2;
const T1 = "2026-10-01T13:23:36.934821+00:00";
const T2 = "2026-10-01T13:25:00.000001+00:00";
let applicants: { nickname: string; arrivedAfter?: string }[] = [];
let now = T1;

function row(nickname: string, i: number, total: number, asOf: string): BadgeRow {
  return {
    application_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
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
    created_at: `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    reviewed_at: null,
    application_count: 1,
    total_applicants: total,
    as_of: asOf,
  };
}

// 快照（asOf）之後才來的不算；沒帶快照就是伺服器的現在。
function serve({ offset = 0, sort = "oldest", asOf }: BadgeQuery = {}): BadgeRow[] {
  const at = asOf ?? now;
  const visible = applicants
    .map((a, i) => ({ ...a, i }))
    .filter((a) => !a.arrivedAfter || a.arrivedAfter < at);
  const rows = visible.map((a) => row(a.nickname, a.i, visible.length, at));
  return (sort === "newest" ? rows.reverse() : rows).slice(offset, offset + PAGE);
}

function held<T>(value: T) {
  let release: () => void = () => {};
  const promise = new Promise<T>((resolve) => {
    release = () => resolve(value);
  });
  return { promise, release: () => release() };
}

const shown = () => screen.getAllByRole("strong").map((el) => el.textContent);
const button = (name: string | RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  applicants = [{ nickname: "早" }, { nickname: "中" }, { nickname: "晚" }];
  now = T1;
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
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    expect(api.badges).toHaveBeenLastCalledWith({ status: "pending", offset: 0, sort: "oldest" });
    expect(button("最舊申請").getAttribute("aria-pressed")).toBe("true");
    expect(button("最新申請").getAttribute("aria-pressed")).toBe("false");
  });

  it("reloads from the first page newest first when 最新申請 is picked", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));

    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["晚", "中"]));
    expect(api.badges).toHaveBeenLastCalledWith({ status: "pending", offset: 0, sort: "newest" });
    expect(button("最新申請").getAttribute("aria-pressed")).toBe("true");

    // 換狀態時排序留著。
    fireEvent.click(button("全部"));
    await waitFor(() =>
      expect(api.badges).toHaveBeenLastCalledWith({ status: "all", offset: 0, sort: "newest" })
    );
  });
});

describe("BadgesTab paging snapshot", () => {
  it("does not repeat or skip anyone when someone applies between pages, newest first", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["晚", "中"]));

    // 有人在第一頁之後申請。沒有快照的話第二頁會是「中、早」：中重複一次。
    applicants.push({ nickname: "新", arrivedAfter: T1 });
    now = T2;

    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["晚", "中", "早"]));
    // 第一頁的 as_of 原字串帶回去（微秒都在）。
    expect(api.badges).toHaveBeenLastCalledWith({
      status: "pending",
      offset: 2,
      sort: "newest",
      asOf: T1,
    });
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();

    // 重新從頭載入（換個排序再換回來）就看得到新來的。
    fireEvent.click(button("最舊申請"));
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["新", "晚"]));
  });

  it("takes the snapshot from the latest first page, not an earlier one that answers late", async () => {
    // 兩個第一頁同時在路上（StrictMode 掛載時把 effect 跑兩次）。先發的那個
    // （T1）卡住，後發的（T2）先回來；先發的晚回來時不能把快照改回 T1。
    const slow = held(serve({ asOf: T1 }));
    api.badges.mockImplementationOnce(() => slow.promise);
    now = T2;

    render(
      <StrictMode>
        <BadgesTab />
      </StrictMode>
    );
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    expect(api.badges.mock.calls.filter(([q]) => q.offset === 0)).toHaveLength(2);
    slow.release();
    await slow.promise;

    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["早", "中", "晚"]));
    expect(api.badges).toHaveBeenLastCalledWith({
      status: "pending",
      offset: 2,
      sort: "oldest",
      asOf: T2,
    });
  });
});
