import { describe, expect, it } from "vitest";
import { r2ConfigFromEnv, signedPut } from "./r2";

const cfg = {
  accountId: "acct",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  bucket: "dailyval",
  publicBase: "https://img.dailyval.com",
};

describe("r2ConfigFromEnv", () => {
  it("五個變數缺一個就是沒設定；publicBase 去尾斜線", () => {
    expect(r2ConfigFromEnv({})).toBeNull();
    expect(
      r2ConfigFromEnv({
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
        R2_BUCKET: "d",
      })
    ).toBeNull();
    expect(
      r2ConfigFromEnv({
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
        R2_BUCKET: "d",
        R2_PUBLIC_BASE: "https://img.dailyval.com//",
      })?.publicBase
    ).toBe("https://img.dailyval.com");
  });
});

describe("signedPut", () => {
  it("簽章是決定性的，而且把 Content-Type、Cache-Control 與 payload hash 都簽進去", async () => {
    const body = new TextEncoder().encode("hello");
    const now = new Date("2026-09-30T12:00:00Z");
    const a = await signedPut(cfg, "articles/2026/09/x.webp", body, "image/webp", now);
    const b = await signedPut(cfg, "articles/2026/09/x.webp", body, "image/webp", now);
    expect(a).toEqual(b);
    expect(a.url).toBe("https://acct.r2.cloudflarestorage.com/dailyval/articles/2026/09/x.webp");
    expect(a.headers["x-amz-date"]).toBe("20260930T120000Z");
    expect(a.headers["x-amz-content-sha256"]).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
    // 精確值由 Python 的 hmac / hashlib 照 SigV4 規範獨立算出，不是從這個實作抄的。
    expect(a.headers.Authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20260930/auto/s3/aws4_request, " +
        "SignedHeaders=cache-control;content-type;host;x-amz-content-sha256;x-amz-date, " +
        "Signature=a79233def7e5dcfaf6ef33e5a8a05bb32995f8dbbb67ffa77b9d64e7c24e99e3"
    );
    // 換一個位元組，簽章就不同：R2 會 403，這正是我們要的。
    const c = await signedPut(cfg, "articles/2026/09/x.webp", new TextEncoder().encode("hellp"), "image/webp", now);
    expect(c.headers.Authorization).not.toBe(a.headers.Authorization);
  });

  it("key 裡需要編碼的字元照 RFC 3986 編，斜線保留", async () => {
    const body = new TextEncoder().encode("hello");
    const now = new Date("2026-09-30T12:00:00Z");
    const signed = await signedPut(cfg, "articles/2026/09/a b(c)*.webp", body, "image/webp", now);
    expect(signed.url).toBe("https://acct.r2.cloudflarestorage.com/dailyval/articles/2026/09/a%20b%28c%29%2A.webp");
  });
});
