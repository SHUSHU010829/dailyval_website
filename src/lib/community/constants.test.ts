import { afterEach, describe, expect, it, vi } from "vitest";

describe("lib/community/constants", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to the production media host when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", undefined as unknown as string);
    const c = await import("@/lib/community/constants");
    expect(c.MEDIA_BASE_URL).toBe("https://img.dailyval.com");
  });

  it("falls back when set but empty or blank", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "  ");
    const c = await import("@/lib/community/constants");
    expect(c.MEDIA_BASE_URL).toBe("https://img.dailyval.com");
  });

  it("uses the configured value and strips trailing slashes", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://pub-x.r2.dev/");
    const c = await import("@/lib/community/constants");
    expect(c.MEDIA_BASE_URL).toBe("https://pub-x.r2.dev");
  });
});
