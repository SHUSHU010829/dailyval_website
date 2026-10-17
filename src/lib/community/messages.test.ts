import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";

// 攤平成 "a.b.c" 路徑；陣列與字串視為葉節點
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

// ICU 變數（{name}）兩個語系必須一致，否則其中一邊會漏帶參數
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function leaves(value: unknown, prefix = ""): Array<[string, string]> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return typeof value === "string" ? [[prefix, value]] : [];
}

describe("communityBoard messages", () => {
  it("has the identical key set in both locales", () => {
    expect(keyPaths(zhTW.communityBoard).sort()).toEqual(
      keyPaths(en.communityBoard).sort(),
    );
  });

  it("has the identical meta.community* key set in both locales", () => {
    for (const name of [
      "community",
      "communityPost",
      "communityUser",
    ] as const) {
      expect(keyPaths(zhTW.meta[name]).sort()).toEqual(
        keyPaths(en.meta[name]).sort(),
      );
    }
  });

  it("uses the same placeholders in both locales", () => {
    const zhLeaves = new Map(leaves(zhTW.communityBoard));
    for (const [path, text] of leaves(en.communityBoard)) {
      expect(placeholders(zhLeaves.get(path) ?? ""), path).toEqual(
        placeholders(text),
      );
    }
  });

  it("covers every error kind the hooks can show", () => {
    const keys = Object.keys(en.communityBoard.errors);
    for (const key of [
      "notSignedIn",
      "banned",
      "featureDisabled",
      "rateLimited",
      "objectionable",
      "invalidBody",
      "tooManyImages",
      "imageUploadFailed",
      "postNotFound",
      "commentNotFound",
      "forbidden",
      "network",
      "unknown",
      "imageTooLarge",
      "imageUnsupported",
    ]) {
      expect(keys).toContain(key);
    }
  });
});
