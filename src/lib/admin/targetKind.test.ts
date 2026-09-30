import { describe, expect, it } from "vitest";
import {
  canUnhide,
  hiddenLabel,
  hideActionLabel,
  isTargetKind,
  TARGET_KINDS,
  targetKindLabel,
} from "./targetKind";

describe("targetKindLabel", () => {
  it("names every kind the console can be handed", () => {
    expect(targetKindLabel("post")).toBe("貼文");
    expect(targetKindLabel("comment")).toBe("留言");
    expect(targetKindLabel("room")).toBe("房間");
    expect(targetKindLabel("skin_comment")).toBe("造型留言");
    expect(targetKindLabel("esports_comment")).toBe("電競留言");
  });

  it("gives each kind its own label", () => {
    // 兩個種類共用一個標籤，就回到「不是貼文就是留言」那個看不出差別的狀態。
    const labels = TARGET_KINDS.map(targetKindLabel);
    expect(new Set(labels).size).toBe(TARGET_KINDS.length);
  });

  it("shows an unknown kind as itself instead of guessing it is a comment", () => {
    // The old console rendered anything that was not "post" as 留言, so a room
    // row read as a comment. A kind the database grows later should look new.
    expect(targetKindLabel("clip")).toBe("clip");
  });

  it("keeps copy free of em-dashes", () => {
    for (const kind of TARGET_KINDS) {
      for (const text of [targetKindLabel(kind), hiddenLabel(kind), hideActionLabel(kind)]) {
        expect(text).not.toMatch(/[—–]/);
      }
    }
  });
});

describe("isTargetKind", () => {
  it("matches the enum exactly", () => {
    for (const kind of TARGET_KINDS) expect(isTargetKind(kind)).toBe(true);
    for (const bad of ["POST", "skin", "", null, undefined, 0]) {
      expect(isTargetKind(bad)).toBe(false);
    }
  });
});

describe("what a kind allows", () => {
  it("only refuses unhide for a room", () => {
    // 房間的下架就是關房，伺服器拒絕重開，所以按鈕不該出現。
    expect(canUnhide("room")).toBe(false);
    for (const kind of ["post", "comment", "skin_comment", "esports_comment"] as const) {
      expect(canUnhide(kind)).toBe(true);
    }
  });

  it("calls a hidden room closed, and everything else taken down", () => {
    expect(hiddenLabel("room")).toBe("已關閉");
    expect(hideActionLabel("room")).toBe("關閉房間並結案");
    for (const kind of ["post", "comment", "skin_comment", "esports_comment"] as const) {
      expect(hiddenLabel(kind)).toBe("已下架");
      expect(hideActionLabel(kind)).toBe("下架並結案");
    }
  });
});
