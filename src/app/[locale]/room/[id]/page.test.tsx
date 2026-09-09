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
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => createTranslator({ locale, messages: locale === "en" ? en : zh, namespace: "room" }),
}));

const id = "0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b";
const found: RoomRead = { kind: "room", room: { id, title: "週末五排一起玩", shard: "na", queue: "unrated",
  memberCount: 2, status: "open", closeReason: null, expiresAt: "2030-01-01T00:15:00Z" } };
const params = () => Promise.resolve({ locale, id });
afterEach(() => { cleanup(); vi.clearAllMocks(); locale = "en"; });

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
