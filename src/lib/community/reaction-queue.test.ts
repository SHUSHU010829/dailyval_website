// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createReactionQueue } from "@/lib/community/reaction-queue";

type Deferred = {
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
};

function deferredSender() {
  const calls: Array<{ kind: string | null; uid: string; d: Deferred }> = [];
  const send = (kind: "like" | "dislike" | null, uid: string) =>
    new Promise<string>((resolve, reject) => {
      calls.push({ kind, uid, d: { resolve, reject } });
    });
  return { calls, send };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("lib/community/reaction-queue", () => {
  it("sends one request and settles with its answer", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError: vi.fn() });

    queue.request("like", "u1");
    expect(calls).toHaveLength(1);
    calls[0].d.resolve("liked");
    await tick();
    expect(onSettled).toHaveBeenCalledWith("liked", "u1", true);
  });

  it("holds a second tap until the first request returns, then sends only the latest intent", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError: vi.fn() });

    queue.request("like", "u1");
    queue.request("dislike", "u1");
    queue.request(null, "u1");
    expect(calls).toHaveLength(1);

    calls[0].d.resolve("liked");
    await tick();
    // 第一次的答案不是最後的意圖；只補送最後的意圖
    expect(onSettled).toHaveBeenCalledWith("liked", "u1", false);
    expect(calls).toHaveLength(2);
    expect(calls[1].kind).toBeNull();

    calls[1].d.resolve("cleared");
    await tick();
    expect(onSettled).toHaveBeenLastCalledWith("cleared", "u1", true);
  });

  it("reports a failure with that request’s token and still sends the newer intent queued behind it", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const onError = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError });

    queue.request("like", "u1");
    queue.request(null, "u1");
    calls[0].d.reject(new Error("rate_limited"));
    await tick();

    expect(onError).toHaveBeenCalledWith(expect.any(Error), "u1");
    expect(onSettled).not.toHaveBeenCalled();
    // 排在後面的「收回」還沒送過，不跟著第一次的失敗一起丟掉
    expect(calls).toHaveLength(2);
    expect(calls[1].kind).toBeNull();
    calls[1].d.resolve("cleared");
    await tick();
    expect(onSettled).toHaveBeenCalledWith("cleared", "u1", true);

    // 之後再按，佇列還能用
    queue.request("like", "u1");
    expect(calls).toHaveLength(3);
  });

  it("treats an identical but newer intent as new: like, unlike, like again before the first fails", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const onError = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError });

    queue.request("like", "u1");
    queue.request(null, "u1");
    queue.request("like", "u1");
    calls[0].d.reject(new Error("network"));
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
    // 第三次的值跟第一次一樣，但它是更新的意圖，要送
    expect(calls).toHaveLength(2);
    expect(calls[1].kind).toBe("like");
    calls[1].d.resolve("liked");
    await tick();
    expect(onSettled).toHaveBeenCalledWith("liked", "u1", true);
  });

  it("reports an intermediate answer as not final, then the last one as final", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError: vi.fn() });
    queue.request("like", "u1");
    queue.request(null, "u1");
    calls[0].d.resolve("liked");
    await tick();
    expect(onSettled).toHaveBeenCalledWith("liked", "u1", false);
    calls[1].d.resolve("cleared");
    await tick();
    expect(onSettled).toHaveBeenLastCalledWith("cleared", "u1", true);
  });

  it("does not resend when the failed request was the last intent", async () => {
    const { calls, send } = deferredSender();
    const onError = vi.fn();
    const queue = createReactionQueue({ send, onSettled: vi.fn(), onError });
    queue.request("like", "u1");
    calls[0].d.reject(new Error("network"));
    await tick();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it("keeps draining after a failure when a newer intent arrived meanwhile", async () => {
    const { calls, send } = deferredSender();
    const onSettled = vi.fn();
    const onError = vi.fn();
    const queue = createReactionQueue({ send, onSettled, onError });

    queue.request("like", "u1|0");
    // 換帳號了，新帳號按了一下
    queue.request("like", "u2|0");
    calls[0].d.reject(new Error("uid_mismatch"));
    await tick();

    expect(onError).toHaveBeenCalledWith(expect.any(Error), "u1|0");
    // 新帳號的意圖不能跟著失敗一起被丟掉
    expect(calls).toHaveLength(2);
    expect(calls[1].uid).toBe("u2|0");
    calls[1].d.resolve("ok");
    await tick();
    expect(onSettled).toHaveBeenCalledWith("ok", "u2|0", true);
  });

  it("sends again when the account changed between taps, even for the same kind", async () => {
    const { calls, send } = deferredSender();
    const queue = createReactionQueue({
      send,
      onSettled: vi.fn(),
      onError: vi.fn(),
    });
    queue.request("like", "u1");
    queue.request("like", "u2");
    calls[0].d.resolve("a");
    await tick();
    expect(calls).toHaveLength(2);
    expect(calls[1].uid).toBe("u2");
  });
});
