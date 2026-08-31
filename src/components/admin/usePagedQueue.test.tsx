// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagedQueue } from "./usePagedQueue";

interface Row {
  id: string;
  total: number;
}

/** A server whose queue shrinks as rows are resolved, which is the whole problem. */
function server(ids: string[], page = 2) {
  const remaining = [...ids];
  return {
    remaining,
    resolve(id: string) {
      remaining.splice(remaining.indexOf(id), 1);
    },
    fetchPage: async (offset: number): Promise<Row[]> =>
      remaining.slice(offset, offset + page).map((id) => ({ id, total: remaining.length })),
  };
}

const opts = (fetchPage: (o: number) => Promise<Row[]>) => ({
  fetchPage,
  totalOf: (rows: Row[], from: number) => (rows.length > 0 ? rows[0].total : from),
  keyOf: (r: Row) => r.id,
});

describe("usePagedQueue", () => {
  it("does not skip a row after one is resolved", async () => {
    // The bug this exists for: take page 1 (A,B), resolve A, and the server's
    // C has moved from index 2 to index 1. Asking for offset 2 starts at D,
    // and C is invisible for the rest of the session.
    const s = server(["A", "B", "C", "D"]);
    const { result } = renderHook(() => usePagedQueue<Row>(opts(s.fetchPage)));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    act(() => {
      s.resolve("A");
      result.current.remove("A");
    });
    await act(async () => {
      await result.current.load(result.current.offset);
    });

    expect(result.current.rows?.map((r) => r.id)).toEqual(["B", "C", "D"]);
  });

  it("keeps the offset honest when nothing was resolved", async () => {
    const s = server(["A", "B", "C", "D"]);
    const { result } = renderHook(() => usePagedQueue<Row>(opts(s.fetchPage)));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    await act(async () => {
      await result.current.load(result.current.offset);
    });
    expect(result.current.rows?.map((r) => r.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("drops a slow response once the fetcher has changed", async () => {
    // Switching filters swaps fetchPage. The previous filter's request can
    // still land afterwards, and rendering its rows under the new filter puts
    // resolved cases in the pending list with the pending action buttons.
    let releaseSlow: (rows: Row[]) => void = () => {};
    const slow = () =>
      new Promise<Row[]>((resolve) => {
        releaseSlow = resolve;
      });
    const fast = async (): Promise<Row[]> => [{ id: "NEW", total: 1 }];

    const { result, rerender } = renderHook(
      ({ f, k }: { f: (o: number) => Promise<Row[]>; k: string }) =>
        usePagedQueue<Row>({ ...opts(f), resetKey: k }),
      { initialProps: { f: slow, k: "open" } }
    );

    rerender({ f: fast, k: "actioned" });
    await waitFor(() => expect(result.current.rows?.[0]?.id).toBe("NEW"));

    await act(async () => {
      releaseSlow([{ id: "STALE", total: 9 }]);
      await Promise.resolve();
    });

    expect(result.current.rows?.map((r) => r.id)).toEqual(["NEW"]);
    expect(result.current.total).toBe(1);
  });

  it("clears the old rows while the new filter loads", async () => {
    // Otherwise the previous filter's rows stay on screen and are rendered
    // with the new filter's action set.
    let release: (rows: Row[]) => void = () => {};
    const first = async (): Promise<Row[]> => [{ id: "OLD", total: 1 }];
    const second = () =>
      new Promise<Row[]>((resolve) => {
        release = resolve;
      });

    const { result, rerender } = renderHook(
      ({ f, k }: { f: (o: number) => Promise<Row[]>; k: string }) =>
        usePagedQueue<Row>({ ...opts(f), resetKey: k }),
      { initialProps: { f: first, k: "open" } }
    );
    await waitFor(() => expect(result.current.rows?.[0]?.id).toBe("OLD"));

    rerender({ f: second, k: "actioned" });
    await waitFor(() => expect(result.current.rows).toBeNull());

    await act(async () => {
      release([{ id: "NEW", total: 1 }]);
      await Promise.resolve();
    });
    expect(result.current.rows?.map((r) => r.id)).toEqual(["NEW"]);
  });

  it("stops paging when a page comes back empty", async () => {
    // Clearing the visible rows auto-loads the next page, so a server that
    // keeps returning nothing while the last-seen total still says "there is
    // more" would be polled forever. An empty page has to collapse the total
    // to the current position.
    let calls = 0;
    const fetchPage = async (): Promise<Row[]> => {
      calls += 1;
      // First call: one row, and a total that claims four more behind it.
      // After that the server has nothing — which is what resolving the only
      // row actually leaves.
      return calls === 1 ? [{ id: "A", total: 5 }] : [];
    };
    const { result } = renderHook(() => usePagedQueue<Row>(opts(fetchPage)));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.total).toBe(5);

    act(() => result.current.remove("A"));
    await waitFor(() => expect(result.current.rows).toHaveLength(0));
    await waitFor(() => expect(result.current.total).toBe(0));

    const settled = calls;
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toBe(settled);
    expect(result.current.offset).toBe(0);
  });

  it("ignores a removal that belongs to a filter you have left", async () => {
    // Approve under "pending", switch to "approved", let that page load, and
    // only then let the action finish. Without a token it removes the newly
    // approved applicant from the NEW dataset and shifts that dataset's paging.
    const pending = async (): Promise<Row[]> => [
      { id: "P1", total: 2 },
      { id: "P2", total: 2 },
    ];
    const approved = async (): Promise<Row[]> => [{ id: "P1", total: 1 }];

    const { result, rerender } = renderHook(
      ({ f, k }: { f: (o: number) => Promise<Row[]>; k: string }) =>
        usePagedQueue<Row>({ ...opts(f), resetKey: k }),
      { initialProps: { f: pending, k: "pending" } }
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    // The action starts here, under "pending".
    const token = result.current.datasetToken();

    rerender({ f: approved, k: "approved" });
    await waitFor(() => expect(result.current.rows?.map((r) => r.id)).toEqual(["P1"]));

    // …and only now does it come back.
    act(() => result.current.remove("P1", token));

    expect(result.current.rows?.map((r) => r.id)).toEqual(["P1"]);
    expect(result.current.total).toBe(1);
    expect(result.current.offset).toBe(1);
  });

  it("still removes when the dataset has not changed under it", async () => {
    const s = server(["A", "B", "C", "D"]);
    const { result } = renderHook(() => usePagedQueue<Row>(opts(s.fetchPage)));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    const token = result.current.datasetToken();
    act(() => {
      s.resolve("A");
      result.current.remove("A", token);
    });
    expect(result.current.rows?.map((r) => r.id)).toEqual(["B"]);
    expect(result.current.offset).toBe(1);
  });

  it("surfaces a failure without wiping what is already loaded", async () => {
    let fail = false;
    const fetchPage = async (offset: number): Promise<Row[]> => {
      if (fail) {
        const err = new Error("找不到");
        err.name = "AdminRequestError";
        throw err;
      }
      return [{ id: `row${offset}`, total: 4 }];
    };
    const { result } = renderHook(() => usePagedQueue<Row>(opts(fetchPage)));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    fail = true;
    await act(async () => {
      await result.current.load(result.current.offset);
    });
    expect(result.current.error).toBe("找不到");
    expect(result.current.rows).toHaveLength(1);
  });
});
