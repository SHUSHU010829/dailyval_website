import { describe, expect, it } from "vitest";
import config from "./next.config";

// social.dailyval.com 退場後掛在這個專案上，靠這張表把舊網址送到 /community。
// 表的順序就是優先順序，host 條件少一條就會把官網自己的路徑也轉走。
const SOCIAL = [{ type: "host", value: "social.dailyval.com" }];

async function socialRedirects() {
  const all = await config.redirects!();
  return all.filter((rule) => JSON.stringify(rule.has) === JSON.stringify(SOCIAL));
}

describe("next.config social.dailyval.com", () => {
  it("sends the retired site's post, author and home URLs to the community board, specific rules first", async () => {
    const rules = await socialRedirects();
    expect(rules.map((rule) => [rule.source, rule.destination])).toEqual([
      ["/:locale(zh-TW|en)/post/:id", "https://dailyval.com/:locale/community/post/:id"],
      ["/:locale(zh-TW|en)/user/:id", "https://dailyval.com/:locale/community/user/:id"],
      ["/:locale(zh-TW|en)", "https://dailyval.com/:locale/community"],
      ["/", "https://dailyval.com/community"],
      ["/:path((?!\\.well-known/).*)", "https://dailyval.com/community"],
    ]);
    expect(rules.every((rule) => rule.permanent)).toBe(true);
  });

  it("only ever redirects the social host, never dailyval.com itself", async () => {
    const all = await config.redirects!();
    for (const rule of all) {
      expect(rule.has?.some((condition) => condition.type === "host")).toBe(true);
    }
  });

  it("keeps serving the social AASA so old shared links still open the app", async () => {
    const { beforeFiles } = (await config.rewrites!()) as {
      beforeFiles: { source: string; has?: unknown; destination: string }[];
    };
    expect(beforeFiles).toContainEqual({
      source: "/.well-known/apple-app-site-association",
      has: SOCIAL,
      destination: "/.well-known/social-apple-app-site-association.json",
    });
  });
});
