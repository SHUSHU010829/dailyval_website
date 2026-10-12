import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh-TW.json";
import { fetchOpenRooms, type ListedRoom, type RoomsRead } from "@/lib/teamup/rooms";
import RoomsPage, { generateMetadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/teamup/rooms", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/teamup/rooms")>(), fetchOpenRooms: vi.fn(),
}));
let requestLocale: string | null = null;
type TranslatorArg = string | { locale?: string; namespace?: string };
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn((value: string) => { requestLocale = value; }),
  getTranslations: async (arg?: TranslatorArg) => {
    const namespace = (typeof arg === "string" ? arg : arg?.namespace) as "rooms";
    const resolved = (typeof arg === "object" ? arg?.locale : undefined) ?? requestLocale;
    if (!resolved) throw new Error("locale unresolved: setRequestLocale was never called");
    return createTranslator({ locale: resolved, messages: resolved === "en" ? en : zh, namespace });
  },
}));

const base: ListedRoom = {
  id: "0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b", title: "今晚衝分", shard: "ap", queue: "competitive",
  memberCount: 3, avgTier: 15.4, rankMin: null, rankMax: null, mic: "required", lang: "zh-TW",
  wantedRoles: ["controller"], queueEligible: null,
  createdAt: "2030-01-01T00:02:00Z", expiresAt: "2030-01-01T00:15:00Z", members: [],
};
const rooms: RoomsRead = { kind: "rooms", rooms: [base, { ...base, id: "1a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b", title: "NA fun", shard: "na" }],
  failedShards: ["eu"], codesEnabled: true, fetchedAt: "2030-01-01T00:05:00Z" };

async function show(locale: string) {
  const messages = locale === "en" ? en : zh;
  render(<NextIntlClientProvider locale={locale} messages={messages}>
    {await RoomsPage({ params: Promise.resolve({ locale }) })}
  </NextIntlClientProvider>);
}
afterEach(() => { cleanup(); vi.clearAllMocks(); requestLocale = null; });

describe("rooms page", () => {
  it("lists every server's rooms with server-side labels", async () => {
    vi.mocked(fetchOpenRooms).mockResolvedValue(rooms);
    await show("zh-TW");
    expect(screen.getByRole("heading", { level: 1, name: "揪團組隊" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "今晚衝分" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "NA fun" })).toBeTruthy();
    expect(screen.getAllByText("3 分鐘前開房")).toHaveLength(2);
    expect(screen.getAllByText("中文（台灣）").length).toBe(2);
    expect(screen.getByRole("alert").textContent).toContain("歐洲（EU）");
  });

  it.each([["unavailable", "Team Up is unavailable"], ["error", "Couldn't load rooms"]] as const)(
    "explains a %s list and offers a reload", async (kind, title) => {
      vi.mocked(fetchOpenRooms).mockResolvedValue({ kind });
      await show("en");
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Refresh" }).getAttribute("href")).toBe("/en/rooms");
    });

  it("is an indexable page at /rooms", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.title).toBe("Team Up | DailyVAL");
    expect(meta.alternates?.canonical).toBe("https://dailyval.com/en/rooms");
    expect(meta.robots).toBeUndefined();
  });
});
