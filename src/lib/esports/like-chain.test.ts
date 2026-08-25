import { describe, expect, it } from "vitest";
import {
  accountReset,
  EMPTY_LIKE_STATE,
  mergeBatch,
  removeComment,
  sendFailure,
  sendSuccess,
  snapshotRevisions,
  tap,
} from "./like-chain";

const ID = "comment-1";

describe("tap", () => {
  it("即時翻面＋讚數 ±1；chain 第一下記 pre-chain 狀態", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 5 }, new Set(), {});
    state = tap(state, ID);
    expect(state.mine[ID]).toBe(true);
    expect(state.counts[ID]).toBe(6);
    expect(state.chains[ID]).toEqual({ preChainLiked: false, preChainCount: 5 });

    // 同一條 chain 的第二下不覆寫 baseline
    state = tap(state, ID);
    expect(state.mine[ID]).toBe(false);
    expect(state.counts[ID]).toBe(5);
    expect(state.chains[ID]).toEqual({ preChainLiked: false, preChainCount: 5 });
  });

  it("取消讚時讚數下限為 0", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 0 }, new Set([ID]), {});
    state = tap(state, ID);
    expect(state.counts[ID]).toBe(0);
  });
});

describe("sendFailure — 回滾基準", () => {
  it("兩次快點回到原點：回滾用 pre-chain，不是送出值的反面", () => {
    // 起點：未讚、3 個讚。點兩下（讚→取消）→ 最終想要的是「未讚」
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 3 }, new Set(), {});
    state = tap(state, ID);
    state = tap(state, ID);
    // 送出（liked=false）失敗 → 回到 pre-chain（未讚、3）——取反會捏造成已讚
    state = sendFailure(state, ID);
    expect(state.mine[ID]).toBe(false);
    expect(state.counts[ID]).toBe(3);
    expect(state.chains[ID]).toBeUndefined();
  });

  it("聽過伺服器就以 confirmed 為基準", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 3 }, new Set(), {});
    state = tap(state, ID);
    state = sendSuccess(state, ID, true, { liked: true, likeCount: 4 });
    // 再點一輪然後失敗 → 回到 confirmed（已讚、4）
    state = tap(state, ID);
    state = sendFailure(state, ID);
    expect(state.mine[ID]).toBe(true);
    expect(state.counts[ID]).toBe(4);
  });
});

describe("sendSuccess", () => {
  it("本地意向仍相符才採用權威讚數", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 3 }, new Set(), {});
    state = tap(state, ID); // 想要 liked=true，UI 4
    const confirmed = sendSuccess(state, ID, true, { liked: true, likeCount: 9 });
    expect(confirmed.counts[ID]).toBe(9);
    expect(confirmed.confirmedCounts[ID]).toBe(9);

    // 送出後又被新的一下超越（意向變 false）→ UI 讚數不動，只記 confirmed
    let superseded = tap(state, ID); // 意向回 false
    superseded = sendSuccess(superseded, ID, true, { liked: true, likeCount: 9 });
    expect(superseded.counts[ID]).toBe(3); // UI 屬於最新的點按
    expect(superseded.confirmedCounts[ID]).toBe(9);
    expect(superseded.chains[ID]).toBeDefined(); // chain 未退場，rollback 基準還在
  });
});

describe("mergeBatch", () => {
  it("pending 或 revision 動過的 id 不覆寫 UI，只補 confirmed 基準", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 3 }, new Set(), {});
    const snapshot = snapshotRevisions(state, [ID]);
    state = tap(state, ID); // 讀取在途中點了一下 → UI 4、pending
    const merged = mergeBatch(state, [ID], { [ID]: 7 }, new Set(), snapshot);
    expect(merged.counts[ID]).toBe(4); // 樂觀值贏 UI
    expect(merged.confirmedCounts[ID]).toBe(3); // 既有 confirmed 不被舊讀覆寫
    expect(merged.mine[ID]).toBe(true);
  });

  it("settled 的 id 以伺服器值覆寫 UI 與 confirmed", () => {
    const state = mergeBatch(
      EMPTY_LIKE_STATE,
      [ID],
      { [ID]: 7 },
      new Set([ID]),
      {}
    );
    expect(state.counts[ID]).toBe(7);
    expect(state.mine[ID]).toBe(true);
    expect(state.confirmedLiked[ID]).toBe(true);
  });

  it("單側失敗（null）不清零另一側", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 5 }, new Set([ID]), {});
    state = mergeBatch(state, [ID], null, null, snapshotRevisions(state, [ID]));
    expect(state.counts[ID]).toBe(5);
    expect(state.mine[ID]).toBe(true);
  });
});

describe("accountReset", () => {
  it("pending 回 confirmed（否則 pre-chain）；我的讚清空、全域讚數保留", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, ["a", "b"], { a: 3, b: 8 }, new Set(["b"]), {});
    state = tap(state, "a"); // pending：UI 4
    const reset = accountReset(state);
    expect(reset.counts.a).toBe(3); // 回 confirmed
    expect(reset.counts.b).toBe(8);
    expect(reset.mine).toEqual({});
    expect(reset.chains).toEqual({});
  });
});

describe("removeComment", () => {
  it("清掉該 id 的所有條目", () => {
    let state = mergeBatch(EMPTY_LIKE_STATE, [ID], { [ID]: 3 }, new Set([ID]), {});
    state = tap(state, ID);
    const removed = removeComment(state, ID);
    expect(removed.counts[ID]).toBeUndefined();
    expect(removed.mine[ID]).toBeUndefined();
    expect(removed.chains[ID]).toBeUndefined();
  });
});
