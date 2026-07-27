import { describe, expect, it, vi } from "vitest";
import { safeRaw } from "./safe-raw";

describe("safeRaw", () => {
  it("returns the raw value when the key resolves successfully", () => {
    const t = { raw: (key: string) => (key === "items" ? ["a", "b"] : undefined) };
    expect(safeRaw(t, "items", [] as string[])).toEqual(["a", "b"]);
  });

  it("returns the fallback when raw() returns undefined", () => {
    const t = { raw: () => undefined };
    expect(safeRaw(t, "missing", [] as string[])).toEqual([]);
  });

  it("returns the fallback when raw() throws", () => {
    const t = {
      raw: () => {
        throw new Error("MISSING_MESSAGE");
      },
    };
    expect(safeRaw(t, "broken", ["fallback"])).toEqual(["fallback"]);
  });

  it("does not throw when raw() throws", () => {
    const t = {
      raw: vi.fn(() => {
        throw new Error("MISSING_MESSAGE");
      }),
    };
    expect(() => safeRaw(t, "broken", [])).not.toThrow();
    expect(t.raw).toHaveBeenCalledWith("broken");
  });
});
