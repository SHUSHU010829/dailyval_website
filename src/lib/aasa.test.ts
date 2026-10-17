import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// apex 的檔案沒有副檔名（Apple 讀固定路徑），import 不進來，用讀檔的。
const read = (name: string) => JSON.parse(readFileSync(join(process.cwd(), "public/.well-known", name), "utf8"));
const apex = read("apple-app-site-association");
const rooms = read("rooms-apple-app-site-association.json");
const social = read("social-apple-app-site-association.json");

// Apple 的比對：components 由上往下，第一個符合的決定；* 是任意字元（含 /），? 是一個字元。
type Component = { "/": string; exclude?: boolean };
function opensApp(file: { applinks: { details: { components: Component[] }[] } }, path: string): boolean {
  for (const component of file.applinks.details[0].components) {
    const pattern = new RegExp(`^${component["/"].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
    if (pattern.test(path)) return !component.exclude;
  }
  return false;
}

describe("universal links", () => {
  it.each(["/rooms", "/rooms/", "/zh-TW/rooms", "/en/rooms", "/zh-TW/rooms/", "/en/rooms/"])(
    "keeps the room list %s in the browser", (path) => {
      expect(opensApp(apex, path)).toBe(false);
    });

  it.each(["/room/0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b", "/zh-TW/room/0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b", "/esports/match/1"])(
    "still opens %s in the app", (path) => {
      expect(opensApp(apex, path)).toBe(true);
    });

  // 貼文開 App（跟 App 自己分享出去的連結一樣）；動態牆、作者頁留在瀏覽器。
  // 放行條目排在社群板的排除條目前面：Apple 第一個符合的生效。
  const POST = "/community/post/51fa3e17-66a5-4f1f-b224-330ea891f101";
  it.each([POST, `/zh-TW${POST}`, `/en${POST}`])("opens the community post %s in the app", (path) => {
    expect(opensApp(apex, path)).toBe(true);
  });

  it.each(["/community", "/zh-TW/community", "/en/community", "/community/user/9e3d05fc-a45b-4176-92f8-5bcd41f67ab8", "/zh-TW/community/user/9e3d05fc-a45b-4176-92f8-5bcd41f67ab8"])(
    "keeps the community board %s in the browser", (path) => {
      expect(opensApp(apex, path)).toBe(false);
    });

  it("on the retired social host, opens only the old post links in the app", () => {
    expect(opensApp(social, "/zh-TW/post/51fa3e17-66a5-4f1f-b224-330ea891f101")).toBe(true);
    expect(opensApp(social, "/en/post/51fa3e17-66a5-4f1f-b224-330ea891f101")).toBe(true);
    expect(opensApp(social, "/zh-TW/user/9e3d05fc-a45b-4176-92f8-5bcd41f67ab8")).toBe(false);
    expect(opensApp(social, "/")).toBe(false);
  });

  it("leaves the rooms host's root to the browser, where it redirects to the list", () => {
    expect(opensApp(rooms, "/")).toBe(false);
    expect(opensApp(rooms, "/room/0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b")).toBe(true);
  });
});
