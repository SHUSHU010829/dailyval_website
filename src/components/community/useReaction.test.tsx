import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { useReaction } from "@/components/community/useReaction";
import { SocialServiceError } from "@/lib/community/errors";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));
vi.mock("@/components/community/CommunityNoticeProvider", () => ({
  useCommunityNotice: () => ({ notify }),
}));

const tick = () => act(async () => {});

describe("components/community/useReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rolls back to the last server-confirmed state, not to the original props", async () => {
    const row = { id: "p" };
    const send = vi
      .fn()
      .mockResolvedValueOnce({ mine: "like", likeCount: 3, dislikeCount: 0 })
      .mockRejectedValueOnce(new SocialServiceError("rate_limited"));
    const { result } = renderHook(() =>
      useReaction({
        row,
        server: { mine: null, likeCount: 2, dislikeCount: 0 },
        uid: "u1",
        send,
      }),
    );

    act(() => {
      result.current.react("like");
    });
    await tick();
    expect(result.current.state).toEqual({
      mine: "like",
      likeCount: 3,
      dislikeCount: 0,
    });

    act(() => {
      result.current.react("like");
    });
    await tick();
    // 取消失敗：伺服器仍是「讚 / 3」，畫面要回到那裡，不是回到 props 的「無 / 2」
    expect(result.current.state).toEqual({
      mine: "like",
      likeCount: 3,
      dislikeCount: 0,
    });
    expect(notify).toHaveBeenCalledWith(
      "error",
      "communityBoard.errors.rateLimited",
    );
  });

  it("advances the rollback baseline on an intermediate success, so a later failure lands on the server’s truth", async () => {
    const row = { id: "p" };
    let resolveLike: (value: unknown) => void = () => {};
    let rejectClear: (error: unknown) => void = () => {};
    const send = vi
      .fn()
      .mockReturnValueOnce(new Promise((r) => (resolveLike = r)))
      .mockReturnValueOnce(new Promise((_, r) => (rejectClear = r)));
    const { result } = renderHook(() =>
      useReaction({
        row,
        server: { mine: null, likeCount: 2, dislikeCount: 0 },
        uid: "u1",
        send,
      }),
    );

    act(() => {
      result.current.react("like"); // → 3, request 1 in flight
    });
    act(() => {
      result.current.react("like"); // → 2, queued
    });
    resolveLike({ mine: "like", likeCount: 3, dislikeCount: 0 });
    await tick();
    expect(send).toHaveBeenCalledTimes(2);
    rejectClear(new SocialServiceError("rate_limited"));
    await tick();
    // 伺服器上是「讚 / 3」（第一次成功了），畫面要回到那裡
    expect(result.current.state).toEqual({
      mine: "like",
      likeCount: 3,
      dislikeCount: 0,
    });
  });

  it("resets to the new row when the row is re-read, and ignores an answer for the old row", async () => {
    let resolve: (value: unknown) => void = () => {};
    const send = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const first = { id: "p" };
    const { result, rerender } = renderHook(
      ({ row, server }) => useReaction({ row, server, uid: "u1", send }),
      {
        initialProps: {
          row: first,
          server: { mine: null, likeCount: 2, dislikeCount: 0 },
        },
      },
    );

    act(() => {
      result.current.react("like");
    });
    expect(result.current.state.likeCount).toBe(3);

    rerender({
      row: { id: "p" },
      server: { mine: null, likeCount: 7, dislikeCount: 1 },
    });
    expect(result.current.state).toEqual({
      mine: null,
      likeCount: 7,
      dislikeCount: 1,
    });

    resolve({ mine: "like", likeCount: 99, dislikeCount: 0 });
    await tick();
    expect(result.current.state.likeCount).toBe(7);
  });

  it("refuses without a viewer", () => {
    const send = vi.fn();
    const { result } = renderHook(() =>
      useReaction({
        row: {},
        server: { mine: null, likeCount: 0, dislikeCount: 0 },
        uid: null,
        send,
      }),
    );
    let accepted = true;
    act(() => {
      accepted = result.current.react("like");
    });
    expect(accepted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends exactly one request per press, even when React re-runs state work in StrictMode", async () => {
    const row = { id: "p" };
    const send = vi
      .fn()
      .mockResolvedValue({ mine: "like", likeCount: 1, dislikeCount: 0 });
    const { result } = renderHook(
      () =>
        useReaction({
          row,
          server: { mine: null, likeCount: 0, dislikeCount: 0 },
          uid: "u1",
          send,
        }),
      { wrapper: StrictMode },
    );
    act(() => {
      result.current.react("like");
    });
    await tick();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
