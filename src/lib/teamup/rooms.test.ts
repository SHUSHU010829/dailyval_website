import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenRooms, fetchRoomCode, parseListedRoom, queueFilterOf, queueNotice } from "./rooms";

const row = (id: string, shard: string, createdAt: string, extra: object = {}) => ({
  id, title: `Room ${id.slice(0, 4)}`, shard, queue_id: "competitive", member_count: 2,
  avg_tier: 14.5, rank_min: 12, rank_max: 18, mic: "required", lang: "zh-TW",
  wanted_roles: ["duelist", "healer"], queue_eligible: false, status: "open",
  created_at: createdAt, expires_at: "2030-01-01T00:15:00Z",
  invite_code: "LEAK12", host_puuid: "private",
  members: [{ is_host: true, game_name: "Host", tag_line: "TW1", incognito: false, card_id: null, tier: 15 }],
  ...extra,
});
const ap = row("aaaaaaaa-0000-4000-8000-000000000001", "ap", "2030-01-01T00:03:00Z");
const na = row("bbbbbbbb-0000-4000-8000-000000000002", "na", "2030-01-01T00:05:00Z");

/** list_rooms by shard; web_codes_enabled answers `codes`. */
function backend(byShard: Record<string, Response | Error>, codes: Response = Response.json(true)) {
  return vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith("/rpc/web_codes_enabled")) return codes.clone();
    const shard = JSON.parse(String(init.body)).p_shard as string;
    const answer = byShard[shard] ?? Response.json([]);
    if (answer instanceof Error) throw answer;
    return answer.clone();
  });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("open room list", () => {
  it("asks every listed server anonymously, uncached, and merges newest first", async () => {
    const fetch = backend({ ap: Response.json([ap]), na: Response.json([na]) });
    vi.stubGlobal("fetch", fetch);
    const read = await fetchOpenRooms(() => new Date("2030-01-01T00:06:00Z"));
    expect(read).toMatchObject({ kind: "rooms", failedShards: [], codesEnabled: true, fetchedAt: "2030-01-01T00:06:00.000Z" });
    expect(read.kind === "rooms" && read.rooms.map((room) => room.shard)).toEqual(["na", "ap"]);
    const shards = fetch.mock.calls.filter(([url]) => url.endsWith("/rpc/list_rooms"))
      .map(([, init]) => JSON.parse(String(init.body)).p_shard).sort();
    expect(shards).toEqual(["ap", "eu", "kr", "na"]);
    for (const [, init] of fetch.mock.calls) {
      expect(init).toMatchObject({ method: "POST", headers: expect.objectContaining({ "Content-Profile": "teamup" }) });
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    }
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/rpc/list_rooms"))?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("keeps only public fields: no code, no puuid, unknown roles dropped", async () => {
    vi.stubGlobal("fetch", backend({ ap: Response.json([ap]) }));
    const read = await fetchOpenRooms();
    const room = read.kind === "rooms" ? read.rooms[0] : null;
    expect(JSON.stringify(room)).not.toContain("LEAK12");
    expect(JSON.stringify(room)).not.toContain("private");
    expect(room).toMatchObject({ avgTier: 14.5, rankMin: 12, rankMax: 18, mic: "required", lang: "zh-TW",
      wantedRoles: ["duelist"], queueEligible: false });
    expect(room?.members).toEqual([{ gameName: "Host", tagLine: "TW1", incognito: false, isHost: true, cardId: null, tier: 15 }]);
  });

  it("drops a malformed room instead of the whole list", async () => {
    vi.stubGlobal("fetch", backend({ ap: Response.json([ap, { ...ap, id: "nope" }, { ...ap, shard: "pbe" }, null]) }));
    const read = await fetchOpenRooms();
    expect(read.kind === "rooms" && read.rooms.length).toBe(1);
  });

  it("lists the servers it could read and names the ones it could not", async () => {
    vi.stubGlobal("fetch", backend({ ap: Response.json([ap]), eu: new Error("offline"),
      kr: Response.json({ message: "db_unavailable" }, { status: 503 }) }));
    const read = await fetchOpenRooms();
    expect(read).toMatchObject({ kind: "rooms", failedShards: ["eu", "kr"] });
    expect(read.kind === "rooms" && read.rooms).toHaveLength(1);
  });

  it("is an error when no server answers, and unavailable when Rooms is off", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchOpenRooms()).toEqual({ kind: "error" });
    const off = Response.json({ message: "feature_disabled" }, { status: 400 });
    vi.stubGlobal("fetch", backend({ ap: off, na: off, eu: off, kr: off }));
    expect(await fetchOpenRooms()).toEqual({ kind: "unavailable" });
  });

  it("treats an unreadable web code flag as off", async () => {
    vi.stubGlobal("fetch", backend({}, Response.json({ message: "not found" }, { status: 404 })));
    expect(await fetchOpenRooms()).toMatchObject({ kind: "rooms", codesEnabled: false });
  });

  it("sorts the queues the app names and calls the rest other", () => {
    expect(["competitive", "unrated", "swiftplay", "deathmatch", "hurm"].map(queueFilterOf))
      .toEqual(["competitive", "unrated", "swiftplay", "other", "other"]);
  });

  it("asks four in Competitive for one more, whatever the last sync said, and warns on Riot's no otherwise", () => {
    const notice = (queue: string, memberCount: number, queueEligible: boolean | null) =>
      queueNotice({ queue, memberCount, queueEligible });
    expect(notice("competitive", 4, false)).toBe("oneMoreForCompetitive");
    expect(notice("competitive", 4, null)).toBe("oneMoreForCompetitive");
    expect(notice("competitive", 4, true)).toBe("oneMoreForCompetitive");
    expect(notice("competitive", 2, false)).toBe("ineligible");
    expect(notice("unrated", 4, false)).toBe("ineligible");
    expect(notice("unrated", 4, true)).toBeNull();
    expect(notice("competitive", 5, null)).toBeNull();
  });

  it("follows the cursor past a full page, and stops at the page cap", async () => {
    const page = (n: number, start: number) => Array.from({ length: n }, (_, i) =>
      row(`cccccccc-0000-4000-8000-${String(start + i).padStart(12, "0")}`, "ap",
        new Date(Date.UTC(2030, 0, 1, 0, 0, 0) - (start + i) * 1000).toISOString()));
    const first = page(100, 0);
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/rpc/web_codes_enabled")) return Response.json(true);
      const body = JSON.parse(String(init.body));
      if (body.p_shard !== "ap") return Response.json([]);
      calls.push(body);
      return Response.json(body.p_cursor_id ? [{ ...page(1, 100)[0], queue_id: "swiftplay" }] : first);
    }));
    const read = await fetchOpenRooms();
    expect(read.kind === "rooms" && read.rooms).toHaveLength(101);
    expect(read.kind === "rooms" && read.rooms.some((room) => room.queue === "swiftplay")).toBe(true);
    expect(calls[1]).toMatchObject({ p_cursor_created_at: first[99].created_at, p_cursor_id: first[99].id });

    let pages = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/rpc/web_codes_enabled")) return Response.json(true);
      if (JSON.parse(String(init.body)).p_shard !== "ap") return Response.json([]);
      pages += 1;
      return Response.json(page(100, pages * 100));
    }));
    await fetchOpenRooms();
    expect(pages).toBe(5);
  });

  it("refuses a room that is not open", () => {
    expect(parseListedRoom({ ...ap, status: "closed" })).toBeNull();
  });
});

describe("room code", () => {
  const id = "AAAAAAAA-0000-4000-8000-000000000001";

  it("asks web_room_code for the lowercased room and returns the code", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json("ABC123"));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchRoomCode(id)).toEqual({ kind: "code", code: "ABC123" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/rpc/web_room_code"), expect.objectContaining({
      method: "POST", body: JSON.stringify({ p_room_id: id.toLowerCase() }),
    }));
  });

  it.each([
    ["room_full", { kind: "refused", reason: "full" }],
    ["room_closed", { kind: "refused", reason: "closed" }],
    ["room_not_found", { kind: "refused", reason: "closed" }],
    ["web_codes_disabled", { kind: "refused", reason: "disabled" }],
    ["feature_disabled", { kind: "refused", reason: "disabled" }],
    ["db_unavailable", { kind: "error" }],
  ])("maps %s", async (message, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message }, { status: 400 })));
    expect(await fetchRoomCode(id)).toEqual(expected);
  });

  it("rejects an answer that is not a code, a failed request, and a bad id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json("<script>")));
    expect(await fetchRoomCode(id)).toEqual({ kind: "error" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchRoomCode(id)).toEqual({ kind: "error" });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await fetchRoomCode("../x")).toEqual({ kind: "refused", reason: "closed" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
