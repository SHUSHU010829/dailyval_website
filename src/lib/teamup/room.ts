import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/esports/constants";

// 舊版 App 的 apex 網域是 catch-all，但尚未支援 HTTPS 房間路由。
// 新的分享網域只由新版 App 宣告，舊版使用者仍可先看到網頁。
export const ROOM_SHARE_ORIGIN =
  process.env.NEXT_PUBLIC_ROOM_SHARE_ORIGIN ?? "https://rooms.dailyval.com";

export interface SharedRoom {
  id: string;
  title: string;
  shard: "ap" | "na" | "eu" | "kr" | "pbe";
  queue: string;
  memberCount: number;
  status: "open" | "closed";
  closeReason: string | null;
  expiresAt: string;
}

export type RoomRead =
  | { kind: "room"; room: SharedRoom }
  | { kind: "unavailable" }
  | { kind: "error" };

export function isRoomID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function roomAppURL(id: string): string | null {
  return isRoomID(id) ? `dailyval://room/${id.toLowerCase()}?src=web` : null;
}

export function roomState(room: SharedRoom, now = Date.now()): "open" | "full" | "closed" | "expired" {
  // 已關閉的房間不會因為稍後超過 expires_at 而變成另一個關閉原因。
  if (room.status === "closed") return room.closeReason === "expired" ? "expired" : "closed";
  if (Date.parse(room.expiresAt) <= now) return "expired";
  return room.memberCount >= 5 ? "full" : "open";
}

// App 的 TeamUpQueueLabel 認得的隊列。建立選單只給前三個，但房主可以拿派對
// 當下的隊列開房（伺服器只擋 ^[a-z0-9]{1,32}$），所以死鬥、火線衝鋒那些也會出現。
const NAMED_QUEUES = [
  "competitive", "unrated", "swiftplay", "spikerush",
  "deathmatch", "hurm", "ggteam", "onefa",
] as const;

export type RoomQueueKey = (typeof NAMED_QUEUES)[number] | "other";

export function roomQueueKey(queue: string): RoomQueueKey {
  return (NAMED_QUEUES as readonly string[]).includes(queue)
    ? (queue as RoomQueueKey)
    : "other";
}

function parseRoom(value: unknown, id: string): SharedRoom | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || row.id.toLowerCase() !== id.toLowerCase()
    || typeof row.title !== "string" || !row.title.trim()
    || typeof row.shard !== "string" || !["ap", "na", "eu", "kr", "pbe"].includes(row.shard)
    || typeof row.queue_id !== "string"
    || !Number.isInteger(row.member_count) || Number(row.member_count) < 0 || Number(row.member_count) > 5
    || (row.status !== "open" && row.status !== "closed")
    || typeof row.expires_at !== "string" || !Number.isFinite(Date.parse(row.expires_at))) return null;
  // 只保留分享頁需要的公開欄位；整份 RPC 回應不會傳給瀏覽器。
  return {
    id: row.id.toLowerCase(), title: row.title,
    shard: row.shard as SharedRoom["shard"], queue: row.queue_id,
    memberCount: Number(row.member_count), status: row.status,
    closeReason: typeof row.close_reason === "string" ? row.close_reason : null,
    expiresAt: row.expires_at,
  };
}

/** 匿名唯讀 RPC，沿用後端的 feature flag；不用服務金鑰或訪客的登入資訊。 */
export async function fetchSharedRoom(id: string): Promise<RoomRead> {
  if (!isRoomID(id)) return { kind: "unavailable" };
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/room`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        "Content-Profile": "teamup",
        "Accept-Profile": "teamup",
      },
      body: JSON.stringify({ p_room_id: id.toLowerCase() }),
      // 房間有效期只有 15 分鐘，關房與 kill switch 不能等 ISR 快取過期。
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const message = body && typeof body === "object" && "message" in body ? body.message : null;
      return { kind: message === "room_not_found" || message === "feature_disabled" ? "unavailable" : "error" };
    }
    const room = parseRoom(body, id);
    return room ? { kind: "room", room } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
