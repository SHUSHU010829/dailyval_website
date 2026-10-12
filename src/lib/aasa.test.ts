import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// apex 的檔案沒有副檔名（Apple 讀固定路徑），import 不進來，用讀檔的。
const read = (name: string) => JSON.parse(readFileSync(join(process.cwd(), "public/.well-known", name), "utf8"));
const apex = read("apple-app-site-association");
const rooms = read("rooms-apple-app-site-association.json");

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

  it("leaves the rooms host's root to the browser, where it redirects to the list", () => {
    expect(opensApp(rooms, "/")).toBe(false);
    expect(opensApp(rooms, "/room/0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b")).toBe(true);
  });
});
