// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BadgeQuery, BadgeRow } from "@/lib/admin/client";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  badges: vi.fn(),
  rejectionReasons: vi.fn(),
  reviewBadge: vi.fn(),
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

// 伺服器那一側，照 admin_badge_queue 的規則：申請照 (created_at, id) 排，
// 快照（asOf）之後才來的不算，游標（after）只回排在它後面的，一頁 PAGE 列。
// 時間都是微秒精度的字串，跟資料庫回來的一樣，確認後台原字串帶回去。
const PAGE = 2;
const T1 = "2026-10-01T13:23:36.934821+00:00";
const T2 = "2026-10-01T13:25:00.000001+00:00";
interface Applicant {
  nickname: string;
  arrivedAfter?: string;
  approved?: boolean;
}
let applicants: Applicant[] = [];
let now = T1;

function row(a: Applicant, i: number, total: number, asOf: string, remaining: number): BadgeRow {
  return {
    application_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    user_id: null,
    legacy_ck_user: `_ck${i}`,
    display_name: null,
    is_verified: false,
    nickname: a.nickname,
    links: [],
    intro: null,
    more_info: null,
    status: a.approved ? "approved" : "pending",
    review_note: null,
    created_at: `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00.000001+00:00`,
    reviewed_at: null,
    application_count: 1,
    total_applicants: total,
    as_of: asOf,
    remaining,
  };
}

function serve({ status = "pending", offset = 0, sort = "oldest", asOf, after }: BadgeQuery = {}): BadgeRow[] {
  const at = asOf ?? now;
  const inSet = applicants
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.arrivedAfter || a.arrivedAfter < at)
    .filter(({ a }) => status === "all" || (status === "pending") === !a.approved);
  let rows = inSet.map(({ a, i }) => row(a, i, inSet.length, at, 0));
  if (sort === "newest") rows = rows.reverse();
  if (after) {
    const key = (r: BadgeRow) => `${r.created_at}|${r.application_id}`;
    const cursor = `${after.at}|${after.id}`;
    rows = rows.filter((r) => (sort === "newest" ? key(r) < cursor : key(r) > cursor));
  }
  const remaining = Math.max(0, rows.length - offset);
  return rows.slice(offset, offset + PAGE).map((r) => ({ ...r, remaining }));
}

function held<T>(value: () => T) {
  let release: () => void = () => {};
  const promise = new Promise<T>((resolve) => {
    release = () => resolve(value());
  });
  return { promise, release: () => release() };
}

const shown = () => screen.getAllByRole("strong").map((el) => el.textContent);
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const cardOf = (nickname: string) => screen.getByText(nickname).closest("li") as HTMLElement;
const lastQuery = () => api.badges.mock.calls.at(-1)?.[0] as BadgeQuery;

beforeEach(() => {
  applicants = [{ nickname: "早" }, { nickname: "中" }, { nickname: "晚" }];
  now = T1;
  api.badges.mockImplementation(async (q: BadgeQuery) => serve(q));
  api.rejectionReasons.mockResolvedValue([]);
  api.reviewBadge.mockResolvedValue({ ok: true });
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

describe("BadgesTab paging", () => {
  it("continues after the last row with the first page's snapshot", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["早", "中", "晚"]));
    expect(lastQuery()).toEqual({
      status: "pending",
      offset: 0,
      sort: "oldest",
      asOf: T1,
      after: {
        at: "2026-09-02T00:00:00.000001+00:00",
        id: "00000000-0000-4000-8000-000000000001",
      },
    });
  });

  it("does not repeat or skip anyone when someone applies between pages, newest first", async () => {
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["晚", "中"]));

    // 有人在第一頁之後申請。offset 翻頁的話第二頁會是「中、早」：中重複一次。
    applicants.push({ nickname: "新", arrivedAfter: T1 });
    now = T2;

    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["晚", "中", "早"]));
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();

    // 重新從頭載入（換個排序再換回來）就看得到新來的。
    fireEvent.click(button("最舊申請"));
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["新", "晚"]));
  });

  it("does not skip anyone when a review finishes while the next page is on its way", async () => {
    // 最新的先 E D C B A。載入 E D，按下 E 的通過（還沒回來），按載入更多；
    // 審核先寫進去，下一頁才查。offset 翻頁會拿到 B A，跳過 C。
    applicants = ["A", "B", "C", "D", "E"].map((nickname) => ({ nickname }));
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["A", "B"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["E", "D"]));

    const review = held(() => ({ ok: true }));
    api.reviewBadge.mockImplementationOnce(() => review.promise);
    fireEvent.click(within(cardOf("E")).getByRole("button", { name: /^通過/ }));

    const page = held(() => {
      applicants[4].approved = true; // 審核在這一頁查詢之前寫進去
      return serve(lastQuery());
    });
    api.badges.mockImplementationOnce(() => page.promise);
    fireEvent.click(button(/載入更多/));
    await act(async () => {
      page.release();
      await page.promise;
    });
    await act(async () => {
      review.release();
      await review.promise;
    });

    await waitFor(() => expect(shown()).toEqual(["D", "C", "B"]));
    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["D", "C", "B", "A"]));
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
  });

  it("keeps the total right when the review answers before the next page", async () => {
    // 最新的先 D C B A。載入 D C，按下 D 的通過，按載入更多；審核先回來
    // （remove 減了總數），下一頁才回來。總數不能被那一頁蓋回 4。
    applicants = ["A", "B", "C", "D"].map((nickname) => ({ nickname }));
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["A", "B"]));
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["D", "C"]));

    const review = held(() => {
      applicants[3].approved = true;
      return { ok: true };
    });
    api.reviewBadge.mockImplementationOnce(() => review.promise);
    fireEvent.click(within(cardOf("D")).getByRole("button", { name: /^通過/ }));

    const page = held(() => serve(lastQuery()));
    api.badges.mockImplementationOnce(() => page.promise);
    fireEvent.click(button(/載入更多/));
    await act(async () => {
      review.release();
      await review.promise;
    });
    await act(async () => {
      page.release();
      await page.promise;
    });

    await waitFor(() => expect(shown()).toEqual(["C", "B", "A"]));
    expect(screen.getByText("3 位申請人，已載入 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
  });

  it("shows an applicant once when a later page brings their newer application", async () => {
    // 第一頁有 X（舊的那份）。翻頁之間 X 多了一份申請，代表換成新的那份，
    // 排到游標後面又出現一次。
    const X1 = { ...row({ nickname: "X 舊" }, 1, 3, T1, 3), legacy_ck_user: "_x" };
    const Y = row({ nickname: "Y" }, 2, 3, T1, 3);
    const X2 = { ...row({ nickname: "X 新" }, 3, 3, T1, 1), legacy_ck_user: "_x", application_count: 2 };
    api.badges
      .mockImplementationOnce(async () => [X1, Y])
      .mockImplementationOnce(async () => [X2]);
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["X 舊", "Y"]));
    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(lastQuery().after?.id).toBe(Y.application_id));
    await waitFor(() => expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull());
    expect(shown()).toEqual(["X 舊", "Y"]);
    expect(screen.getByText("2 位申請人，已載入 2")).toBeTruthy();

    // 通過 X 會關掉他所有的申請，藏起來的那列也一起拿掉，不會冒出來。
    fireEvent.click(within(cardOf("X 舊")).getByRole("button", { name: /^通過/ }));
    await waitFor(() => expect(shown()).toEqual(["Y"]));
    expect(api.reviewBadge).toHaveBeenCalledTimes(1);
  });

  it("does not bring a reviewed applicant back when their other application arrives on a late page", async () => {
    // 第一頁 X(舊) Y。X 多了一份申請（CloudKit 匯入、時間在快照之前），下一頁
    // 會帶來 X(新) Z，但它還在路上時 X 的通過先完成，兩份一起關掉。
    const X1 = { ...row({ nickname: "X 舊" }, 1, 3, T1, 3), legacy_ck_user: "_x" };
    const Y = row({ nickname: "Y" }, 2, 3, T1, 3);
    const X2 = { ...row({ nickname: "X 新" }, 3, 4, T1, 2), legacy_ck_user: "_x", application_count: 2 };
    const Z = row({ nickname: "Z" }, 4, 4, T1, 2);
    const page = held(() => [X2, Z]);
    api.badges
      .mockImplementationOnce(async () => [X1, Y])
      .mockImplementationOnce(() => page.promise);
    render(<BadgesTab />);
    await waitFor(() => expect(shown()).toEqual(["X 舊", "Y"]));

    fireEvent.click(button(/載入更多/));
    fireEvent.click(within(cardOf("X 舊")).getByRole("button", { name: /^通過/ }));
    await waitFor(() => expect(shown()).toEqual(["Y"]));
    await act(async () => {
      page.release();
      await page.promise;
    });

    await waitFor(() => expect(shown()).toEqual(["Y", "Z"]));
    expect(screen.queryByText("X 新")).toBeNull();
    expect(screen.getByText("2 位申請人，已載入 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();

    // 從頭載入是新的一輪：X 如果又有待審的申請，要看得到。
    api.badges.mockImplementation(async () => [X2]);
    fireEvent.click(button("最新申請"));
    await waitFor(() => expect(shown()).toEqual(["X 新"]));
  });

  it("takes the snapshot from the latest first page, not an earlier one that answers late", async () => {
    // 兩個第一頁同時在路上（StrictMode 掛載時把 effect 跑兩次）。先發的那個
    // （T1）卡住，後發的（T2）先回來；先發的晚回來時不能把快照改回 T1。
    const slow = held(() => serve({ asOf: T1 }));
    api.badges.mockImplementationOnce(() => slow.promise);
    now = T2;

    render(
      <StrictMode>
        <BadgesTab />
      </StrictMode>
    );
    await waitFor(() => expect(shown()).toEqual(["早", "中"]));
    expect(api.badges.mock.calls.filter(([q]) => q.offset === 0 && !q.after)).toHaveLength(2);
    await act(async () => {
      slow.release();
      await slow.promise;
    });

    fireEvent.click(button(/載入更多/));
    await waitFor(() => expect(shown()).toEqual(["早", "中", "晚"]));
    expect(lastQuery().asOf).toBe(T2);
  });
});
