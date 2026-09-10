import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import en from "../../../../../messages/en.json";
import zh from "../../../../../messages/zh-TW.json";
import { APP_STORE_URL } from "@/lib/site-config";
import { fetchSharedRoom, type RoomRead } from "@/lib/teamup/room";
import RoomPage, { generateMetadata } from "./page";

vi.mock("@/lib/teamup/room", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/teamup/room")>(), fetchSharedRoom: vi.fn(),
}));
let locale = "en";
// 照 next-intl 的解析順序：明示的 locale 優先，否則用 setRequestLocale 記下的那個。
// 少了這一層，頁面就算固定要英文也會通過中文那條測試。
let requestLocale: string | null = null;
type TranslatorArg = string | { locale?: string; namespace?: string };
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn((value: string) => { requestLocale = value; }),
  getTranslations: async (arg?: TranslatorArg) => {
    // 這個頁面只用 "room" 這個 namespace；型別窄化到它，測試才不必複述整份字典的型別。
    const namespace = (typeof arg === "string" ? arg : arg?.namespace) as "room";
    const resolved = (typeof arg === "object" ? arg?.locale : undefined) ?? requestLocale;
    if (!resolved) throw new Error("locale unresolved: setRequestLocale was never called");
    return resolved === "en"
      ? createTranslator({ locale: resolved, messages: en, namespace })
      : createTranslator({ locale: resolved, messages: zh, namespace });
  },
}));

const id = "0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b";
const found: RoomRead = { kind: "room", room: { id, title: "週末五排一起玩", shard: "na", queue: "unrated",
  memberCount: 2, status: "open", closeReason: null, expiresAt: "2030-01-01T00:15:00Z" } };
const params = () => Promise.resolve({ locale, id });
afterEach(() => { cleanup(); vi.clearAllMocks(); locale = "en"; requestLocale = null; });

describe("room landing", () => {
  it("shows server, queue, players and both App actions without joining on the web", async () => {
    vi.mocked(fetchSharedRoom).mockResolvedValue(found);
    render(await RoomPage({ params: params() }));
    expect(screen.getByRole("heading", { name: found.room.title }).tagName).toBe("H1");
    expect(screen.getByText("North America (NA)")).toBeTruthy();
    expect(screen.getByText("Unrated")).toBeTruthy();
    expect(screen.getByText("2 / 5")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View room in DailyVal" }).getAttribute("href")).toBe(`dailyval://room/${id}?src=web`);
    expect(screen.getByRole("link", { name: "Download DailyVal" }).getAttribute("href")).toBe(APP_STORE_URL);
    expect(screen.getByRole("link", { name: "Refresh room status" }).getAttribute("href")).toBe(`/en/room/${id}`);
    expect(screen.getByText(/Joining requires a Riot account on North America \(NA\)/)).toBeTruthy();
  });

  it("names the mode a party brought in, not just the three the create sheet offers", async () => {
    vi.mocked(fetchSharedRoom).mockResolvedValue({ ...found, room: { ...found.room, queue: "hurm" } });
    render(await RoomPage({ params: params() }));
    expect(screen.getByText("Team Deathmatch")).toBeTruthy();
    // 兩份字典都要有：漏一個 key，next-intl 只會把 "queues.hurm" 印在頁面上。
    for (const messages of [en.room.queues, zh.room.queues] as Record<string, string>[])
      for (const key of ["competitive", "unrated", "swiftplay", "spikerush",
        "deathmatch", "hurm", "ggteam", "onefa", "other"])
        expect(messages[key]).toBeTruthy();
  });

  it("drops the join requirement once the room stops accepting players", async () => {
    vi.mocked(fetchSharedRoom).mockResolvedValue({
      ...found, room: { ...found.room, status: "closed", closeReason: "host_closed" },
    });
    render(await RoomPage({ params: params() }));
    expect(screen.getByText("Room closed")).toBeTruthy();
    expect(screen.queryByText(/Joining requires a Riot account/)).toBeNull();
  });

  it("renders Traditional Chinese expiry copy and retains locale when refreshing", async () => {
    locale = "zh-TW";
    vi.mocked(fetchSharedRoom).mockResolvedValue({ ...found, room: { ...found.room, expiresAt: "2000-01-01T00:00:00Z" } });
    render(await RoomPage({ params: params() }));
    expect(screen.getByText("房間已過期")).toBeTruthy();
    expect(screen.getByRole("link", { name: "重新整理房間狀態" }).getAttribute("href")).toBe(`/zh-TW/room/${id}`);
  });

  it.each(["unavailable", "error"] as const)("renders a useful %s state", async (kind) => {
    vi.mocked(fetchSharedRoom).mockResolvedValue({ kind });
    render(await RoomPage({ params: params() }));
    expect(screen.getByRole("heading", { name: kind === "error" ? "Couldn’t load this room" : "Room unavailable" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: found.room.title })).toBeNull();
    if (kind === "error") expect(screen.getByRole("link", { name: "Try again" })).toBeTruthy();
  });

  it("includes current room metadata and the Smart App Banner target", async () => {
    vi.mocked(fetchSharedRoom).mockResolvedValue(found);
    const meta = await generateMetadata({ params: params() });
    expect(meta.title).toBe(`${found.room.title} | DailyVal`);
    expect(meta.description).toContain("North America (NA) · Unrated · 2/5");
    expect(meta.alternates?.canonical).toBe(`https://rooms.dailyval.com/en/room/${id}`);
    expect(meta.itunes).toEqual({ appId: "1637782901", appArgument: `dailyval://room/${id}?src=web` });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.openGraph?.images).toEqual(expect.arrayContaining([expect.objectContaining({ url: `/og/room?id=${id}&locale=en` })]));
  });
});
