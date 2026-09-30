// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportQuery, ReportRow } from "@/lib/admin/client";

// 只換掉打 API 的那一層，其他（型別、錯誤類別）用真的。
const api = vi.hoisted(() => ({
  reports: vi.fn(),
  resolveTarget: vi.fn(),
  setHidden: vi.fn(),
  deleteContent: vi.fn(),
  ban: vi.fn(),
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

const PAGE = 50;
const at = "2026-09-01T00:00:00Z";

/** A fake queue on the server: each target is either open or already decided. */
let targets: { id: string; open: boolean }[] = [];

function row(id: string, total: number): ReportRow {
  return {
    target_kind: "post",
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
  };
}

function serve({ status = "open", offset = 0 }: ReportQuery = {}): ReportRow[] {
  const visible = targets.filter((t) =>
    status === "all" ? true : status === "open" ? t.open : !t.open
  );
  return visible.slice(offset, offset + PAGE).map((t) => row(t.id, visible.length));
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
  vi.clearAllMocks();
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
