import { describe, expect, it } from "vitest";
import { chunk } from "./chunk";

describe("chunk", () => {
  it("空清單、未滿一塊、剛好一塊、多一筆", () => {
    expect(chunk([], 50)).toEqual([]);
    expect(chunk([1, 2], 50)).toEqual([[1, 2]]);
    const fifty = Array.from({ length: 50 }, (_, i) => i);
    expect(chunk(fifty, 50)).toEqual([fifty]);
    const fiftyOne = Array.from({ length: 51 }, (_, i) => i);
    expect(chunk(fiftyOne, 50)).toHaveLength(2);
    expect(chunk(fiftyOne, 50)[1]).toEqual([50]);
  });

  it("size 非正數丟例外", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
