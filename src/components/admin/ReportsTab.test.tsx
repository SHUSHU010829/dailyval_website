// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequestError, type ReportQuery, type ReportRow } from "@/lib/admin/client";
import type { TargetKind } from "@/lib/admin/targetKind";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  reports: vi.fn(),
  resolveTarget: vi.fn(),
  setHidden: vi.fn(),
  deleteContent: vi.fn(),
  ban: vi.fn(),
  banLegacy: vi.fn(),
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

import { ReportsTab } from "./AdminConsole";

let PAGE = 50;
const at = "2026-09-01T00:00:00Z";
// 快照時間是微秒精度的字串，跟資料庫回來的一樣，確認後台原字串帶回去。
const SNAP = "2026-10-01T13:23:36.934821+00:00";

/** A fake queue on the server: each target is either open or already decided. */
let targets: { id: string; open: boolean; kind?: TargetKind }[] = [];

function row(id: string, total: number, kind: TargetKind = "post", remaining = total): ReportRow {
  return {
    target_kind: kind,
    target_id: id,
    open_reports: 1,
    total_targets: total,
    first_reported_at: at,
    last_reported_at: at,
    reasons: ["spam"],
    author: { name: "作者", claimed: false },
    reporters: [],
    body: `內容 ${id}`,
    images: [],
    content_exists: true,
    is_hidden: false,
    created_at: at,
    author_id: null,
    author_name: "作者",
    legacy_ck_user: null,
    report_count: 1,
    prior_actions: 0,
    author_prior_actions: 0,
    as_of: SNAP,
    remaining,
  };
}

// 每個目標的排序鍵都一樣（1 筆、同一個時間），所以伺服器的順序就是 id 的
// 順序，游標之後 = id 比游標大的。
function serve({ status = "open", offset = 0, kinds = [], after }: ReportQuery = {}): ReportRow[] {
  const visible = targets
    .filter(
      (t) =>
        (status === "all" ? true : status === "open" ? t.open : !t.open) &&
        (kinds.length === 0 || kinds.includes(t.kind ?? "post"))
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rest = after ? visible.filter((t) => t.id > after.id) : visible;
  const remaining = Math.max(0, rest.length - offset);
  return rest
    .slice(offset, offset + PAGE)
    .map((t) => row(t.id, visible.length, t.kind, remaining));
}

/** A mutation the test lets through when it wants to. */
function held<T>(apply: () => T) {
  let release: () => void = () => {};
  const promise = new Promise<T>((resolve) => {
    release = () => resolve(apply());
  });
  return { promise, release: () => release() };
}

const rowOf = (id: string) => screen.getByText(`內容 ${id}`).closest("li") as HTMLElement;
const group = (name: string) => screen.getByRole("group", { name });

beforeEach(() => {
  // reset 而不只是 clear：失敗的測試留下沒用完的 mockImplementationOnce，
  // 不能漏到下一個測試。
  vi.resetAllMocks();
  PAGE = 50;
  api.reports.mockImplementation(async (q: ReportQuery) => serve(q));
});

afterEach(cleanup);

describe("ReportsTab", () => {
  it("does not keep a resolved row or skip a target when the sort changes mid-action", async () => {
    // Codex's repro: 53 open targets. Resolve t01, switch the sort before the
    // resolve returns, and let the new first page land first. That page still
    // has t01 and says 53; without a refetch, load-more asks for offset 50 of
    // a queue that is now 52 long and t51 is never shown.
    targets = Array.from({ length: 53 }, (_, i) => ({
      id: `t${String(i + 1).padStart(2, "0")}`,
      open: true,
    }));
    render(<ReportsTab />);
    await screen.findByText("內容 t01");
    expect(screen.getByText("53 個目標，已載入 50")).toBeTruthy();

    const resolve = held(() => {
      targets = targets.map((t) => (t.id === "t01" ? { ...t, open: false } : t));
      return { ok: true, closed: 1 };
    });
    api.resolveTarget.mockReturnValueOnce(resolve.promise);
    fireEvent.click(within(rowOf("t01")).getByRole("button", { name: "沒問題，結案" }));

    fireEvent.click(within(group("排序")).getByRole("button", { name: "最新檢舉" }));
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "newest", offset: 0 })
      )
    );
    await screen.findByText("內容 t01");

    await act(async () => resolve.release());

    await waitFor(() => expect(screen.queryByText("內容 t01")).toBeNull());
    expect(screen.getByText("52 個目標，已載入 50")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await screen.findByText("內容 t53");
    for (const t of targets.filter((x) => x.open)) {
      expect(screen.getAllByText(`內容 ${t.id}`)).toHaveLength(1);
    }
    expect(screen.getByText("52 個目標，已載入 52")).toBeTruthy();
  });

  it("does not leave a hidden row in 待處理 when the status changes mid-action", async () => {
    // The pre-existing status filter has the same hole, and through an action
    // that never removes a row: hiding under 全部 leaves the row in that
    // dataset, but it must not show up in 待處理 once the hide has committed.
    targets = [
      { id: "t01", open: true },
      { id: "t02", open: true },
    ];
    render(<ReportsTab />);
    await screen.findByText("內容 t01");
    fireEvent.click(within(group("狀態")).getByRole("button", { name: "全部" }));
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(expect.objectContaining({ status: "all" }))
    );
    await screen.findByText("內容 t01");

    const hide = held(() => {
      targets = targets.map((t) => (t.id === "t01" ? { ...t, open: false } : t));
      return { ok: true, changed: true };
    });
    api.setHidden.mockReturnValueOnce(hide.promise);
    fireEvent.click(within(rowOf("t01")).getByRole("button", { name: "下架並結案" }));

    fireEvent.click(within(group("狀態")).getByRole("button", { name: "待處理" }));
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(expect.objectContaining({ status: "open" }))
    );
    await screen.findByText("內容 t01");

    await act(async () => hide.release());

    await waitFor(() => expect(screen.queryByText("內容 t01")).toBeNull());
    expect(screen.getByText("內容 t02")).toBeTruthy();
    expect(screen.getByText("1 個目標，已載入 1")).toBeTruthy();
  });

  it("starts over at the first page when the refetch after an action fails", async () => {
    // Codex round 2: 53 skin-comment targets, resolve t01, switch the sort,
    // let the new page land, then the resolve succeeds and the refetch it
    // triggers fails once with a 503. The old counters survived the failed
    // reset, so the empty list auto-paged from offset 50 and showed only
    // t52/t53, with no error and no way back to t02..t51.
    targets = Array.from({ length: 53 }, (_, i) => ({
      id: `t${String(i + 1).padStart(2, "0")}`,
      open: true,
      kind: "skin_comment" as const,
    }));
    targets.unshift({ id: "p01", open: true, kind: "post" });
    render(<ReportsTab />);
    await screen.findByText("內容 p01");

    fireEvent.click(within(group("種類")).getByRole("button", { name: "造型留言" }));
    await screen.findByText("造型留言 53 個目標，已載入 50");

    const resolve = held(() => {
      targets = targets.map((t) => (t.id === "t01" ? { ...t, open: false } : t));
      return { ok: true, closed: 1 };
    });
    api.resolveTarget.mockReturnValueOnce(resolve.promise);
    fireEvent.click(within(rowOf("t01")).getByRole("button", { name: "沒問題，結案" }));

    fireEvent.click(within(group("排序")).getByRole("button", { name: "最新檢舉" }));
    await screen.findByText("造型留言 53 個目標，已載入 50");

    // The refetch the successful resolve triggers is the one that fails.
    api.reports.mockImplementationOnce(async () => {
      throw new AdminRequestError("請求失敗（503）", 503);
    });
    await act(async () => resolve.release());

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "請求失敗（503）");
    // Give a runaway auto-page every chance to fire before checking it did not.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("內容 t52")).toBeNull();
    expect(screen.queryByText(/個目標/)).toBeNull();
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
    const failedCalls = api.reports.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
    await screen.findByText("內容 t02");
    expect(api.reports.mock.calls.length).toBe(failedCalls + 1);
    expect(api.reports).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0, sort: "newest", kinds: ["skin_comment"] })
    );
    expect(screen.getByText("造型留言 52 個目標，已載入 50")).toBeTruthy();
    expect(screen.queryByText("內容 t01")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await screen.findByText("內容 t53");
    for (const t of targets.filter((x) => x.open && x.kind === "skin_comment")) {
      expect(screen.getAllByText(`內容 ${t.id}`)).toHaveLength(1);
    }
  });

  it("says which kind and sort are selected, not only by colour", async () => {
    targets = [{ id: "t01", open: true }];
    render(<ReportsTab />);
    await screen.findByText("內容 t01");

    const kinds = group("種類");
    expect(within(kinds).getByRole("button", { name: "全部", pressed: true })).toBeTruthy();
    expect(within(kinds).getByRole("button", { name: "造型留言", pressed: false })).toBeTruthy();
    fireEvent.click(within(kinds).getByRole("button", { name: "造型留言" }));
    expect(within(kinds).getByRole("button", { name: "造型留言", pressed: true })).toBeTruthy();
    expect(within(kinds).getByRole("button", { name: "全部", pressed: false })).toBeTruthy();
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(
        expect.objectContaining({ kinds: ["skin_comment"], offset: 0 })
      )
    );

    const sorts = group("排序");
    expect(within(sorts).getByRole("button", { name: "檢舉最多", pressed: true })).toBeTruthy();
    fireEvent.click(within(sorts).getByRole("button", { name: "最舊檢舉" }));
    expect(within(sorts).getByRole("button", { name: "最舊檢舉", pressed: true })).toBeTruthy();
    expect(within(sorts).getByRole("button", { name: "檢舉最多", pressed: false })).toBeTruthy();

    const statuses = group("狀態");
    expect(within(statuses).getByRole("button", { name: "待處理", pressed: true })).toBeTruthy();
  });
});

describe("ReportsTab paging", () => {
  const lastQuery = () => api.reports.mock.calls.at(-1)?.[0] as ReportQuery;
  const shownIds = () =>
    screen.getAllByText(/^內容 /).map((el) => el.textContent?.replace("內容 ", ""));

  it("continues after the last row on screen with the first page's snapshot", async () => {
    targets = Array.from({ length: 53 }, (_, i) => ({
      id: `t${String(i + 1).padStart(2, "0")}`,
      open: true,
    }));
    render(<ReportsTab />);
    await screen.findByText("53 個目標，已載入 50");
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await screen.findByText("內容 t53");
    expect(lastQuery()).toEqual({
      status: "open",
      offset: 0,
      sort: "most",
      kinds: [],
      asOf: SNAP,
      after: { open: 1, first: at, last: at, kind: "post", id: "t50" },
    });
    expect(screen.getByText("53 個目標，已載入 53")).toBeTruthy();
  });

  it("does not skip a target when an action lands before the next page is queried", async () => {
    // t1 t2 | t3 t4。結案 t1 還沒回來就按載入更多；結案先寫進去、下一頁才查。
    // offset 翻頁會拿到 t4（跳過 t3）。
    PAGE = 2;
    targets = ["t1", "t2", "t3", "t4"].map((id) => ({ id, open: true }));
    render(<ReportsTab />);
    await screen.findByText("4 個目標，已載入 2");

    const resolve = held(() => ({ ok: true, closed: 1 }));
    api.resolveTarget.mockReturnValueOnce(resolve.promise);
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "沒問題，結案" }));

    const page = held(() => {
      targets = targets.map((t) => (t.id === "t1" ? { ...t, open: false } : t));
      return serve(lastQuery());
    });
    api.reports.mockReturnValueOnce(page.promise);
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await act(async () => page.release());
    await act(async () => resolve.release());

    await waitFor(() => expect(shownIds()).toEqual(["t2", "t3", "t4"]));
    expect(screen.getByText("3 個目標，已載入 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
  });

  it("keeps the total right when the action answers before the next page", async () => {
    PAGE = 2;
    targets = ["t1", "t2", "t3", "t4"].map((id) => ({ id, open: true }));
    render(<ReportsTab />);
    await screen.findByText("4 個目標，已載入 2");

    const resolve = held(() => {
      targets = targets.map((t) => (t.id === "t1" ? { ...t, open: false } : t));
      return { ok: true, closed: 1 };
    });
    api.resolveTarget.mockReturnValueOnce(resolve.promise);
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "沒問題，結案" }));

    const page = held(() => serve(lastQuery()));
    api.reports.mockReturnValueOnce(page.promise);
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await act(async () => resolve.release());
    await act(async () => page.release());

    await waitFor(() => expect(shownIds()).toEqual(["t2", "t3", "t4"]));
    expect(screen.getByText("3 個目標，已載入 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
  });

  it("shows a target once when a later page brings it again", async () => {
    // 翻頁之間 t1 的排序鍵變了（晚提交的檢舉），排到游標後面又出現一次。
    targets = [{ id: "t1", open: true }, { id: "t2", open: true }];
    api.reports
      .mockImplementationOnce(async () => [row("t1", 3, "post", 3), row("t2", 3, "post", 3)])
      .mockImplementationOnce(async () => [row("t1", 3, "post", 1)]);
    render(<ReportsTab />);
    await screen.findByText("內容 t2");
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await waitFor(() => expect(lastQuery().after?.id).toBe("t2"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull());
    expect(shownIds()).toEqual(["t1", "t2"]);
    expect(screen.getByText("2 個目標，已載入 2")).toBeTruthy();
  });

  it("never stores a second copy of a target, so draining the page skips nothing", async () => {
    // Codex：第一頁 A B，第二頁 A C（A 的檢舉數變少、排到游標後面），D 還沒
    // 看到。A 的第二份不進分頁狀態；結案 A、B、C 之後從頭載入看得到 D。
    PAGE = 2;
    targets = ["A", "B", "C", "D"].map((id) => ({ id, open: true }));
    api.reports
      .mockImplementationOnce(async () => [row("A", 4, "post", 4), row("B", 4, "post", 4)])
      .mockImplementationOnce(async () => [row("A", 4, "post", 3), row("C", 4, "post", 3)]);
    render(<ReportsTab />);
    await screen.findByText("內容 B");
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await waitFor(() => expect(shownIds()).toEqual(["A", "B", "C"]));
    expect(screen.getByText("4 個目標，已載入 3")).toBeTruthy();

    for (const id of ["A", "B", "C"]) {
      targets = targets.map((t) => (t.id === id ? { ...t, open: false } : t));
      fireEvent.click(within(rowOf(id)).getByRole("button", { name: "沒問題，結案" }));
      await waitFor(() => expect(screen.queryByText(`內容 ${id}`)).toBeNull());
    }
    await screen.findByText("內容 D");
    expect(lastQuery()).toEqual(expect.objectContaining({ offset: 0 }));
    expect(lastQuery().after).toBeUndefined();
    expect(screen.getByText("1 個目標，已載入 1")).toBeTruthy();
  });

  it("drops a repeat even when the action and the page settle in the same batch", async () => {
    // Codex 第二輪：第二頁 [A, C] 的狀態更新還沒 commit，A 的結案就完成了。
    PAGE = 2;
    targets = ["A", "B", "C", "D"].map((id) => ({ id, open: true }));
    const page = held(() => [row("A", 4, "post", 3), row("C", 4, "post", 3)]);
    api.reports
      .mockImplementationOnce(async () => [row("A", 4, "post", 4), row("B", 4, "post", 4)])
      .mockImplementationOnce(() => page.promise);
    render(<ReportsTab />);
    await screen.findByText("內容 B");

    const resolve = held(() => {
      targets = targets.map((t) => (t.id === "A" ? { ...t, open: false } : t));
      return { ok: true, closed: 1 };
    });
    api.resolveTarget.mockReturnValueOnce(resolve.promise);
    fireEvent.click(within(rowOf("A")).getByRole("button", { name: "沒問題，結案" }));
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await act(async () => {
      page.release();
      resolve.release();
      await Promise.all([page.promise, resolve.promise]);
    });

    await waitFor(() => expect(shownIds()).toEqual(["B", "C"]));
    for (const id of ["B", "C"]) {
      targets = targets.map((t) => (t.id === id ? { ...t, open: false } : t));
      fireEvent.click(within(rowOf(id)).getByRole("button", { name: "沒問題，結案" }));
      await waitFor(() => expect(screen.queryByText(`內容 ${id}`)).toBeNull());
    }
    await screen.findByText("內容 D");
    expect(screen.getByText("1 個目標，已載入 1")).toBeTruthy();
  });

  it("keeps asking past many pages of repeats instead of calling it the end", async () => {
    // Codex 第三輪：已經載入的目標一頁一頁排到游標後面（每個都被結掉一筆
    // 檢舉），連續十幾頁都是重複，後面才是沒看過的 D。
    PAGE = 2;
    targets = [];
    // 每一頁的順序輪流換，才看得出游標每次都從上一個回應的最後一列接下去。
    const repeats = Array.from({ length: 12 }, (_, i) => async () =>
      i % 2 === 0
        ? [row("X", 3, "post", 3), row("Y", 3, "post", 3)]
        : [row("Y", 3, "post", 3), row("X", 3, "post", 3)]
    );
    api.reports.mockImplementationOnce(async () => [row("X", 3, "post", 3), row("Y", 3, "post", 3)]);
    for (const page of repeats) api.reports.mockImplementationOnce(page);
    api.reports.mockImplementationOnce(async () => [row("D", 3, "post", 1)]);
    render(<ReportsTab />);
    await screen.findByText("內容 Y");
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await screen.findByText("內容 D");
    expect(shownIds()).toEqual(["X", "Y", "D"]);
    expect(screen.getByText("3 個目標，已載入 3")).toBeTruthy();
    expect(api.reports).toHaveBeenCalledTimes(14);
    // 第一次接在畫面上最後一列（Y）後面，之後每次接在上一頁的最後一列後面。
    const cursors = api.reports.mock.calls.slice(1).map(([q]) => (q as ReportQuery).after?.id);
    const lastOfEachRepeat = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "Y" : "X"));
    expect(cursors).toEqual(["Y", ...lastOfEachRepeat]);
  });

  it("falls back to total_targets while the database is still the old version", async () => {
    targets = [{ id: "t1", open: true }, { id: "t2", open: true }];
    api.reports.mockImplementationOnce(async () =>
      serve({}).map((r) => {
        const old: Partial<ReportRow> = { ...r };
        delete old.remaining;
        delete old.as_of;
        return old as ReportRow;
      })
    );
    render(<ReportsTab />);
    await screen.findByText("2 個目標，已載入 2");
    expect(screen.queryByRole("button", { name: /載入更多/ })).toBeNull();
  });

  it("does not bring back a target resolved while a late page was on its way", async () => {
    targets = [{ id: "t1", open: true }, { id: "t2", open: true }];
    const page = held(() => [row("t1", 3, "post", 2), row("t3", 3, "post", 2)]);
    api.reports
      .mockImplementationOnce(async () => [row("t1", 3, "post", 3), row("t2", 3, "post", 3)])
      .mockImplementationOnce(() => page.promise);
    render(<ReportsTab />);
    await screen.findByText("內容 t2");

    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "沒問題，結案" }));
    await waitFor(() => expect(screen.queryByText("內容 t1")).toBeNull());
    await act(async () => page.release());

    await waitFor(() => expect(shownIds()).toEqual(["t2", "t3"]));
    expect(screen.getByText("2 個目標，已載入 2")).toBeTruthy();
  });

  it("takes the snapshot from the latest first page when the sort changes mid-load", async () => {
    // 篩選列在載入中還在，所以第一頁還沒回來就能換排序。先發的第一頁晚回來，
    // 不能把快照換成它的。
    PAGE = 2;
    targets = ["t1", "t2", "t3"].map((id) => ({ id, open: true }));
    const OLD = "2026-10-01T13:00:00.000001+00:00";
    const slow = held(() => serve({}).map((r) => ({ ...r, as_of: OLD })));
    api.reports.mockReturnValueOnce(slow.promise);
    render(<ReportsTab />);
    fireEvent.click(within(group("排序")).getByRole("button", { name: "最新檢舉" }));
    await screen.findByText("3 個目標，已載入 2");
    await act(async () => slow.release());

    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await screen.findByText("內容 t3");
    expect(lastQuery()).toEqual(expect.objectContaining({ sort: "newest", asOf: SNAP }));
  });
});

describe("ReportsTab bans", () => {
  const LEGACY = "_legacy_ck";
  const NATIVE = "aaaaaaaa-0000-4000-8000-000000000001";
  const SAME_RIOT = "cccccccc-0000-4000-8000-000000000003";

  function legacyRow(id: string, extra: Partial<ReportRow> = {}): ReportRow {
    return {
      ...row(id, 2),
      author: { name: "舊版作者", claimed: false, ck_user: LEGACY },
      legacy_ck_user: LEGACY,
      author_status: { ban_key: LEGACY, ban_key_kind: "ck_user", banned: false, ban_reason: null, accounts: [] },
      ...extra,
    };
  }

  function nativeRow(id: string, extra: Partial<ReportRow> = {}): ReportRow {
    return {
      ...row(id, 1),
      author: { name: "新版作者", claimed: true, user_id: NATIVE },
      author_id: NATIVE,
      author_status: { ban_key: null, ban_key_kind: null, banned: false, ban_reason: null, accounts: [] },
      ...extra,
    };
  }

  it("bans a 2.4.0 author by their legacy key and marks every row of theirs", async () => {
    api.reports.mockResolvedValue([legacyRow("t1"), legacyRow("t2")]);
    api.banLegacy.mockResolvedValue({ ok: true });
    const ask = vi.spyOn(window, "prompt").mockReturnValue("洗版");
    render(<ReportsTab />);
    await screen.findByText("內容 t1");

    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    await waitFor(() => expect(api.banLegacy).toHaveBeenCalledWith("ck_user", LEGACY, "洗版"));
    // 舊身分沒有帳號：問理由的時候就講清楚它擋的是之後同步進來的內容。
    expect(ask.mock.calls[0][0]).toMatch(/舊版/);
    expect(api.ban).not.toHaveBeenCalled();
    for (const id of ["t1", "t2"]) {
      const b = await within(rowOf(id)).findByRole("button", { name: "作者已封禁" });
      expect((b as HTMLButtonElement).disabled).toBe(true);
    }
    // 封禁不處置內容：兩列都還在。
    expect(screen.getByText("內容 t2")).toBeTruthy();
  });

  it("bans a claimed author by account", async () => {
    api.reports.mockResolvedValue([nativeRow("t1")]);
    api.ban.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("spam");
    render(<ReportsTab />);
    await screen.findByText("內容 t1");

    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    await waitFor(() => expect(api.ban).toHaveBeenCalledWith(NATIVE, "spam", null));
    expect(api.banLegacy).not.toHaveBeenCalled();
  });

  it("shows a ban the server already has, in every status", async () => {
    api.reports.mockResolvedValue([
      legacyRow("t1", {
        author_status: { ban_key: LEGACY, ban_key_kind: "ck_user", banned: true, ban_reason: "洗版", accounts: [] },
      }),
    ]);
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    const b = within(rowOf("t1")).getByRole("button", { name: "作者已封禁" });
    expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(within(rowOf("t1")).getByText(/封禁理由：洗版/)).toBeTruthy();

    fireEvent.click(within(group("狀態")).getByRole("button", { name: "已處置" }));
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(expect.objectContaining({ status: "actioned" }))
    );
    await screen.findByText("內容 t1");
    expect(within(rowOf("t1")).getByRole("button", { name: "作者已封禁" })).toBeTruthy();
  });

  it("lists the new-app account on the same Riot account and bans it only when asked", async () => {
    api.reports.mockResolvedValue([
      legacyRow("t1", {
        author_status: {
          ban_key: LEGACY,
          ban_key_kind: "ck_user",
          banned: false,
          ban_reason: null,
          accounts: [
            { user_id: SAME_RIOT, name: "Same#RIOT", game_name: "Same", tag_line: "RIOT", banned: false },
          ],
        },
      }),
    ]);
    api.ban.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("同一個人");
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    expect(within(rowOf("t1")).getByText(/同一個 Riot 帳號/)).toBeTruthy();
    expect(api.ban).not.toHaveBeenCalled();

    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "封禁這個帳號" }));
    await waitFor(() => expect(api.ban).toHaveBeenCalledWith(SAME_RIOT, "同一個人", null));
    await within(rowOf("t1")).findByText("· 封禁中");
    // 帳號封了，舊身分還沒：那是另一個決定。
    expect(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" })).toBeTruthy();
    expect(api.banLegacy).not.toHaveBeenCalled();
  });

  it("offers no ban when the database has no status and the author has no account", async () => {
    // 資料庫還是舊版（沒有 author_status）：照舊只有帳號封得了。
    api.reports.mockResolvedValue([{ ...legacyRow("t1"), author_status: undefined }]);
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    expect(within(rowOf("t1")).queryByRole("button", { name: /封禁/ })).toBeNull();
  });

  it("does nothing when the reason prompt is cancelled", async () => {
    api.reports.mockResolvedValue([legacyRow("t1")]);
    vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    expect(api.banLegacy).not.toHaveBeenCalled();
    expect(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" })).toBeTruthy();
  });

  it("bans a legacy skin comment's author by author key and says it follows no account", async () => {
    const KEY = "35bbbbbb-0000-4000-8000-0000000000b2";
    api.reports.mockResolvedValue([
      {
        ...row("t1", 1, "skin_comment"),
        author: { name: "造型作者", claimed: false, puuid: KEY },
        author_status: {
          ban_key: KEY,
          ban_key_kind: "author_key",
          banned: false,
          ban_reason: null,
          accounts: [],
        },
      },
    ]);
    api.banLegacy.mockResolvedValue({ ok: true });
    const ask = vi.spyOn(window, "prompt").mockReturnValue("洗版");
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    await waitFor(() => expect(api.banLegacy).toHaveBeenCalledWith("author_key", KEY, "洗版"));
    expect(ask.mock.calls[0][0]).toMatch(/不會跟著封到任何帳號/);
  });

  it("lets a read issued after the ban override the local mark", async () => {
    // 這裡封了，之後別的地方解除：換篩選重讀回來的是 banned:false，按鈕要回來。
    api.reports.mockResolvedValue([legacyRow("t1")]);
    api.banLegacy.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("洗版");
    render(<ReportsTab />);
    await screen.findByText("內容 t1");
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    await within(rowOf("t1")).findByRole("button", { name: "作者已封禁" });

    fireEvent.click(within(group("狀態")).getByRole("button", { name: "全部" }));
    await waitFor(() =>
      expect(api.reports).toHaveBeenLastCalledWith(expect.objectContaining({ status: "all" }))
    );
    await within(rowOf("t1")).findByRole("button", { name: "永久封禁作者" });
  });

  it("keeps the local mark over a read that was issued before the ban finished", async () => {
    // 第二頁在封禁還在路上時發出：伺服器那時候還說沒封，那一列要照這裡的標記。
    PAGE = 1;
    api.reports.mockResolvedValueOnce([legacyRow("t1")]);
    render(<ReportsTab />);
    await screen.findByText("內容 t1");

    const ban = held(() => ({ ok: true }));
    api.banLegacy.mockReturnValueOnce(ban.promise);
    vi.spyOn(window, "prompt").mockReturnValue("洗版");
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    const stale = held(() => [{ ...legacyRow("t2"), remaining: 1 }]);
    api.reports.mockReturnValueOnce(stale.promise);
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await act(async () => ban.release());
    await act(async () => stale.release());

    await screen.findByText("內容 t2");
    expect(within(rowOf("t2")).getByRole("button", { name: "作者已封禁" })).toBeTruthy();
  });

  it("trusts a repeat read that went out after the ban, even inside the same load-more", async () => {
    // Codex round 2：載入更多的第一次讀取整頁都是重複的，於是再要一次。第二次是在
    // 封禁完成之後才發出的，伺服器說沒封（別人已經解除），那就以伺服器為準。
    PAGE = 1;
    api.reports.mockResolvedValueOnce([{ ...legacyRow("t1"), remaining: 3 }]);
    render(<ReportsTab />);
    await screen.findByText("內容 t1");

    const ban = held(() => ({ ok: true }));
    api.banLegacy.mockReturnValueOnce(ban.promise);
    vi.spyOn(window, "prompt").mockReturnValue("洗版");
    fireEvent.click(within(rowOf("t1")).getByRole("button", { name: "永久封禁作者" }));
    const dup = held(() => [{ ...legacyRow("t1"), remaining: 3 }]);
    api.reports.mockReturnValueOnce(dup.promise);
    api.reports.mockResolvedValueOnce([{ ...legacyRow("t2"), remaining: 2 }]);
    fireEvent.click(screen.getByRole("button", { name: /載入更多/ }));
    await act(async () => ban.release());
    await act(async () => dup.release());

    await screen.findByText("內容 t2");
    expect(within(rowOf("t2")).getByRole("button", { name: "永久封禁作者" })).toBeTruthy();
    // t1 是封禁完成之前讀的，照這裡的標記。
    expect(within(rowOf("t1")).getByRole("button", { name: "作者已封禁" })).toBeTruthy();
  });
});
