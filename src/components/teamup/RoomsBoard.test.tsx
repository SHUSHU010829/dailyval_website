import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh-TW.json";
import { fetchRoomCode } from "@/lib/teamup/rooms";
import type { RoomView } from "./RoomCard";
import RoomsBoard from "./RoomsBoard";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/teamup/rooms", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/teamup/rooms")>(), fetchRoomCode: vi.fn(),
}));

let n = 0;
function room(shard: RoomView["shard"], queue: string, extra: Partial<RoomView> = {}): RoomView {
  n += 1;
  return {
    id: `0000000${n}-0000-4000-8000-000000000000`, title: `${shard} ${queue} ${n}`, shard, queue,
    memberCount: 2, avgTier: 15, rankMin: null, rankMax: null, mic: "preferred", lang: null,
    wantedRoles: [], queueEligible: null, createdAt: "2030-01-01T00:00:00Z", expiresAt: "2030-01-01T00:15:00Z",
    members: [{ gameName: "Host", tagLine: "TW1", incognito: false, isHost: true, cardId: null, tier: 15 }],
    openedAgo: "3 min. ago", langLabel: null, ...extra,
  };
}

function board(rooms: RoomView[], { codesEnabled = true, failedServers = null as string | null, locale = "en",
  fetchedAt = "2030-01-01T00:05:00Z" } = {}) {
  return (
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : zh}>
      <RoomsBoard rooms={rooms} codesEnabled={codesEnabled} failedServers={failedServers} fetchedAt={fetchedAt} />
    </NextIntlClientProvider>
  );
}
const show = (rooms: RoomView[], options: Parameters<typeof board>[1] = {}) => render(board(rooms, options));

const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
const filter = (group: string, name: RegExp) =>
  fireEvent.click(within(screen.getByRole("group", { name: group })).getByRole("button", { name }));

beforeEach(() => { n = 0; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("rooms board", () => {
  it("shows every server by default and filters by server and mode with live counts", () => {
    const rooms = [room("ap", "competitive"), room("na", "unrated"), room("ap", "deathmatch"), room("kr", "competitive")];
    show(rooms);
    expect(titles()).toHaveLength(4);
    expect(screen.getByText("4 rooms")).toBeTruthy();

    filter("Server", /Asia Pacific \(AP\)/);
    expect(titles()).toEqual(["ap competitive 1", "ap deathmatch 3"]);
    // 模式那一組的數字跟著伺服器變：AP 只有一間積分、一間其他。
    expect(within(screen.getByRole("group", { name: "Game mode" })).getByRole("button", { name: /Competitive/ }).textContent).toContain("1");

    filter("Game mode", /Other mode/);
    expect(titles()).toEqual(["ap deathmatch 3"]);
    expect(screen.getByRole("button", { name: /Other mode/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("separates an empty board from filters that hide everything", () => {
    show([room("na", "unrated")]);
    filter("Server", /Korea/);
    expect(screen.getByRole("heading", { name: "No rooms match these filters" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(titles()).toEqual(["na unrated 1"]);
    cleanup();
    show([]);
    expect(screen.getByRole("heading", { name: "No open rooms right now" })).toBeTruthy();
  });

  it("refreshes only when asked", () => {
    show([room("ap", "competitive")]);
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("names the servers it could not read", () => {
    show([room("ap", "competitive")], { failedServers: "Europe (EU) and Korea (KR)" });
    expect(screen.getByRole("alert").textContent).toContain("Europe (EU) and Korea (KR)");
  });

  it("dims a full room and keeps its code button off", () => {
    show([room("ap", "competitive", { memberCount: 5 })]);
    expect(screen.getByText("Room full")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copy code" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("masks incognito members and warns when the party cannot queue", () => {
    show([room("ap", "competitive", { queueEligible: false, members: [
      { gameName: null, tagLine: null, incognito: true, isHost: true, cardId: null, tier: null }] })]);
    expect(screen.getAllByText("Incognito player").length).toBeGreaterThan(0);
    expect(screen.getByText("This party can't queue for that mode right now")).toBeTruthy();
  });

  it("reads ranks out for screen readers", () => {
    show([room("ap", "competitive", { avgTier: 15.4, rankMin: 12, rankMax: 18 })]);
    expect(screen.getByRole("img", { name: "Average rank: Platinum 1" })).toBeTruthy();
    expect(screen.getByText("Gold 1 to Diamond 1")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Platinum 1" })).toBeTruthy();   // the host's own tier
    cleanup();
    show([room("ap", "competitive", { avgTier: 27, rankMin: 0, rankMax: 24 })], { locale: "zh-TW" });
    expect(screen.getByRole("img", { name: "平均牌階：輻能戰魂" })).toBeTruthy();
    expect(screen.getByText("牌階未定 到 神話1")).toBeTruthy();
  });

  it("uses Traditional Chinese copy", () => {
    show([room("ap", "competitive")], { locale: "zh-TW" });
    expect(screen.getByRole("button", { name: "複製代碼" })).toBeTruthy();
    expect(screen.getByText("1 間房間")).toBeTruthy();
  });
});

describe("copy code", () => {
  const writeText = vi.fn();
  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("gets the code on press, shows it and copies it", async () => {
    vi.mocked(fetchRoomCode).mockResolvedValue({ kind: "code", code: "JFR921" });
    show([room("ap", "competitive")]);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByText("JFR921");
    expect(fetchRoomCode).toHaveBeenCalledWith("00000001-0000-4000-8000-000000000000");
    expect(writeText).toHaveBeenCalledWith("JFR921");
    expect(screen.getByText("Copied. Join the party with it in VALORANT.")).toBeTruthy();
  });

  it("still shows the code when the browser refuses to copy, and copies on the second press", async () => {
    vi.mocked(fetchRoomCode).mockResolvedValue({ kind: "code", code: "KQH495" });
    writeText.mockRejectedValueOnce(new Error("NotAllowedError"));
    show([room("ap", "competitive")]);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByText("Couldn't copy automatically. Type this code in instead.");
    expect(screen.getByText("KQH495")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await screen.findByText("Copied. Join the party with it in VALORANT.");
  });

  it.each([
    [{ kind: "refused", reason: "closed" } as const, "This room has closed. Refresh to see other rooms.", false],
    [{ kind: "refused", reason: "full" } as const, "The room just filled up. Try another one.", true],
    [{ kind: "refused", reason: "disabled" } as const, "Room codes are only available in the app for now.", false],
    [{ kind: "error" } as const, "Couldn't get the code. Try again.", true],
  ])("explains a refusal: %o", async (result, message, keepsButton) => {
    vi.mocked(fetchRoomCode).mockResolvedValue(result);
    show([room("ap", "competitive")]);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByText(message);
    expect(writeText).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryAllByRole("button", { name: /Copy code|Try again/ }).length > 0).toBe(keepsButton));
  });

  it("starts every card's code over on a refresh", async () => {
    vi.mocked(fetchRoomCode).mockResolvedValue({ kind: "code", code: "JFR921" });
    const view = show([room("ap", "competitive")]);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByText("JFR921");
    // 拿到代碼之後房間滿了：重新整理後不能再留著舊代碼和「複製」。
    view.rerender(board([room("ap", "competitive", { id: "00000001-0000-4000-8000-000000000000", memberCount: 5 })],
      { fetchedAt: "2030-01-01T00:06:00Z" }));
    expect(screen.queryByText("JFR921")).toBeNull();
    expect((screen.getByRole("button", { name: "Copy code" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("brings the button back when web codes come back on", async () => {
    vi.mocked(fetchRoomCode).mockResolvedValue({ kind: "refused", reason: "disabled" });
    const view = show([room("ap", "competitive")]);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByText("Room codes are only available in the app for now.");
    expect(screen.queryByRole("button", { name: "Copy code" })).toBeNull();
    view.rerender(board([room("ap", "competitive", { id: "00000001-0000-4000-8000-000000000000" })],
      { fetchedAt: "2030-01-01T00:06:00Z" }));
    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
  });

  it("offers no button while web codes are off", () => {
    show([room("ap", "competitive")], { codesEnabled: false });
    expect(screen.queryByRole("button", { name: "Copy code" })).toBeNull();
    expect(screen.getByText("Room codes are only available in the app for now.")).toBeTruthy();
  });
});
