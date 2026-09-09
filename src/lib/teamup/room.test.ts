import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSharedRoom, isRoomID, roomAppURL, roomQueueKey, roomState, type SharedRoom } from "./room";

const id = "0a4c9c2e-6c1b-4f0a-9a0b-8e6c1d2f3a4b";
const row = { id, title: "一起五排", shard: "ap", queue_id: "competitive", member_count: 3,
  status: "open", close_reason: null, expires_at: "2030-01-01T00:15:00Z" };
const room: SharedRoom = { id, title: row.title, shard: "ap", queue: "competitive", memberCount: 3,
  status: "open", closeReason: null, expiresAt: row.expires_at };

afterEach(() => vi.unstubAllGlobals());

describe("room sharing reads", () => {
  it("uses an anonymous no-store teamup RPC and projects only share fields", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...row, invite_code: "SECRET", host_puuid: "private", members: [] }));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchSharedRoom(id.toUpperCase())).toEqual({ kind: "room", room });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/rpc/room"), expect.objectContaining({
      method: "POST", cache: "no-store", body: JSON.stringify({ p_room_id: id }),
      headers: expect.objectContaining({ "Content-Profile": "teamup", "Accept-Profile": "teamup" }),
      signal: expect.any(AbortSignal),
    }));
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it.each(["no-room", `${id}/extra`, "", "../room", ` ${id}`])("rejects invalid id %s before contacting the backend", async (invalid) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(isRoomID(invalid)).toBe(false);
    expect(roomAppURL(invalid)).toBeNull();
    expect(await fetchSharedRoom(invalid)).toEqual({ kind: "unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["room_not_found", "feature_disabled"])("shows %s as unavailable", async (message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message }, { status: 400 })));
    expect(await fetchSharedRoom(id)).toEqual({ kind: "unavailable" });
  });

  it("keeps transport failures distinct from missing rooms and retries on the next request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(Response.json(row)));
    expect(await fetchSharedRoom(id)).toEqual({ kind: "error" });
    expect((await fetchSharedRoom(id)).kind).toBe("room");
  });

  it("does not report a server failure as a deleted room", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "db_unavailable" }, { status: 503 })));
    expect(await fetchSharedRoom(id)).toEqual({ kind: "error" });
  });

  it.each([null, [], { ...row, id: "different" }, { ...row, member_count: "3" },
    { ...row, member_count: 6 }, { ...row, expires_at: "invalid" }, { ...row, shard: ["ap"] }])("rejects a malformed room response", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
    expect(await fetchSharedRoom(id)).toEqual({ kind: "error" });
  });
});

describe("room state and App links", () => {
  const now = Date.parse("2030-01-01T00:00:00Z");
  it("expires an open room before the server sweep catches up, including a full room", () => {
    expect(roomState(room, now)).toBe("open");
    expect(roomState({ ...room, memberCount: 5 }, now)).toBe("full");
    expect(roomState({ ...room, memberCount: 5 }, Date.parse(room.expiresAt))).toBe("expired");
  });
  it("preserves the closed reason after the old expiry timestamp", () => {
    expect(roomState({ ...room, status: "closed", closeReason: "host_closed" }, Infinity)).toBe("closed");
    expect(roomState({ ...room, status: "closed", closeReason: "expired" }, now)).toBe("expired");
  });
  it("builds the same lowercase custom-scheme path that iOS accepts", () => {
    expect(roomAppURL(id.toUpperCase())).toBe(`dailyval://room/${id}?src=web`);
  });
  it("keeps every mode the App names; only unknown ids fall back", () => {
    const named = ["competitive", "unrated", "swiftplay", "spikerush",
      "deathmatch", "hurm", "ggteam", "onefa"];
    expect(named.map(roomQueueKey)).toEqual(named);
    // 伺服器的 ^[a-z0-9]{1,32}$ 擋掉 premier-seasonmatch，它開不了房。
    expect(["newmap", "", "competitive2"].map(roomQueueKey)).toEqual(["other", "other", "other"]);
  });
});
