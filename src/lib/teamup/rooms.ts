import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/esports/constants";

// 網頁的揪團列表：所有伺服器開著的房，加上「複製代碼」。
// 網頁沒有 Riot 登入，所以不走 App 的 join_room；代碼只在按下按鈕時跟伺服器拿
// （teamup.web_room_code），列表的回應裡從來沒有代碼。

/** 列表要問的伺服器。PBE 是測試服，不列。 */
export const LISTED_SHARDS = ["ap", "na", "eu", "kr"] as const;
export type ListedShard = (typeof LISTED_SHARDS)[number];

export const ROOM_ROLES = ["duelist", "initiator", "controller", "sentinel"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];
export type RoomMic = "required" | "preferred" | "none";

export interface ListedMember {
  /** 隱身的成員沒有名字（伺服器已經遮掉）。 */
  gameName: string | null;
  tagLine: string | null;
  incognito: boolean;
  isHost: boolean;
  cardId: string | null;
  tier: number | null;
}

export interface ListedRoom {
  id: string;
  title: string;
  shard: ListedShard;
  queue: string;
  memberCount: number;
  avgTier: number | null;
  rankMin: number | null;
  rankMax: number | null;
  mic: RoomMic;
  lang: string | null;
  wantedRoles: RoomRole[];
  /** null = Riot 沒說；只有 false 才提醒。 */
  queueEligible: boolean | null;
  createdAt: string;
  expiresAt: string;
  members: ListedMember[];
}

export type RoomsRead =
  | { kind: "rooms"; rooms: ListedRoom[]; failedShards: ListedShard[]; codesEnabled: boolean; fetchedAt: string }
  | { kind: "unavailable" }
  | { kind: "error" };

export type RoomCodeResult =
  | { kind: "code"; code: string }
  | { kind: "refused"; reason: "full" | "closed" | "disabled" }
  | { kind: "error" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOM_CODE = /^[A-Z0-9]{4,12}$/;

function rpc(name: string, body: object, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      "Content-Profile": "teamup",
      "Accept-Profile": "teamup",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    ...init,
  });
}

async function errorMessage(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" && "message" in body ? body.message : null;
  } catch {
    return null;
  }
}

function tierOrNull(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 31 ? Number(value) : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseMember(value: unknown): ListedMember | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const incognito = row.incognito === true;
  return {
    // 伺服器已經遮掉隱身成員的名字；這裡再擋一次，不靠單一層。
    gameName: incognito ? null : stringOrNull(row.game_name),
    tagLine: incognito ? null : stringOrNull(row.tag_line),
    incognito,
    isHost: row.is_host === true,
    cardId: typeof row.card_id === "string" && UUID.test(row.card_id) ? row.card_id.toLowerCase() : null,
    tier: tierOrNull(row.tier),
  };
}

/** 一間房的公開欄位；不認得的房（缺欄位、型別不對）整間丟掉，不讓一列壞資料拖垮列表。 */
export function parseListedRoom(value: unknown): ListedRoom | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !UUID.test(row.id)
    || typeof row.title !== "string" || !row.title.trim()
    || typeof row.shard !== "string" || !(LISTED_SHARDS as readonly string[]).includes(row.shard)
    || typeof row.queue_id !== "string"
    || !Number.isInteger(row.member_count) || Number(row.member_count) < 0 || Number(row.member_count) > 5
    || row.status !== "open"
    || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))
    || typeof row.expires_at !== "string" || !Number.isFinite(Date.parse(row.expires_at))) return null;
  const avgTier = typeof row.avg_tier === "number" && Number.isFinite(row.avg_tier) ? row.avg_tier : null;
  const roles = Array.isArray(row.wanted_roles) ? row.wanted_roles : [];
  const members = Array.isArray(row.members) ? row.members : [];
  return {
    id: row.id.toLowerCase(),
    title: row.title,
    shard: row.shard as ListedShard,
    queue: row.queue_id,
    memberCount: Number(row.member_count),
    avgTier,
    rankMin: tierOrNull(row.rank_min),
    rankMax: tierOrNull(row.rank_max),
    mic: row.mic === "required" || row.mic === "none" ? row.mic : "preferred",
    lang: stringOrNull(row.lang),
    wantedRoles: roles.filter((role): role is RoomRole => (ROOM_ROLES as readonly unknown[]).includes(role)),
    queueEligible: typeof row.queue_eligible === "boolean" ? row.queue_eligible : null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    members: members.map(parseMember).filter((member): member is ListedMember => member !== null),
  };
}

type ShardRead = { kind: "rooms"; rooms: ListedRoom[] } | { kind: "unavailable" } | { kind: "error" };

/** list_rooms 一頁最多 100 間；開著的房平常是個位數，這是讓篩選不漏掉後面幾頁的上限。 */
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

async function fetchShard(shard: ListedShard): Promise<ShardRead> {
  const rooms: ListedRoom[] = [];
  let cursor: { createdAt: string; id: string } | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await rpc("list_rooms", {
        p_shard: shard, p_queue_id: null,
        p_cursor_created_at: cursor?.createdAt ?? null, p_cursor_id: cursor?.id ?? null, p_limit: PAGE_SIZE,
      }, { cache: "no-store" });
      if (!response.ok) {
        return { kind: (await errorMessage(response)) === "feature_disabled" ? "unavailable" : "error" };
      }
      const body: unknown = await response.json();
      if (!Array.isArray(body)) return { kind: "error" };
      rooms.push(...body.map(parseListedRoom).filter((room): room is ListedRoom => room !== null));
      if (body.length < PAGE_SIZE) break;
      // 游標取這一頁最後一列的原始值：那一列就算格式不對被丟掉，下一頁也要從它之後接。
      const last: unknown = body[body.length - 1];
      const row = last && typeof last === "object" ? last as Record<string, unknown> : {};
      if (typeof row.created_at !== "string" || typeof row.id !== "string") break;
      cursor = { createdAt: row.created_at, id: row.id };
    }
    return { kind: "rooms", rooms };
  } catch {
    return { kind: "error" };
  }
}

/** 網頁能不能給代碼（web_codes_enabled）；讀不到就當作不能，不放一個按了會失敗的按鈕。 */
export async function fetchCodesEnabled(): Promise<boolean> {
  try {
    const response = await rpc("web_codes_enabled", {}, { cache: "no-store" });
    return response.ok && (await response.json()) === true;
  } catch {
    return false;
  }
}

/**
 * 所有伺服器開著的房，新的在前。每個伺服器一個匿名、不快取的請求（房間只活幾分鐘）。
 * 一部分伺服器讀不到時照樣列出讀得到的，並說出缺了哪幾個。
 */
export async function fetchOpenRooms(now = () => new Date()): Promise<RoomsRead> {
  const [reads, codesEnabled] = await Promise.all([
    Promise.all(LISTED_SHARDS.map(fetchShard)),
    fetchCodesEnabled(),
  ]);
  if (reads.some((read) => read.kind === "unavailable")) return { kind: "unavailable" };
  const failedShards = LISTED_SHARDS.filter((_, index) => reads[index].kind === "error");
  if (failedShards.length === LISTED_SHARDS.length) return { kind: "error" };
  const rooms = reads
    .flatMap((read) => (read.kind === "rooms" ? read.rooms : []))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? 1 : -1));
  return { kind: "rooms", rooms, failedShards, codesEnabled, fetchedAt: now().toISOString() };
}

/** 拿一間房的代碼。在瀏覽器裡呼叫：每按一次，伺服器就替那間房記一筆。 */
export async function fetchRoomCode(id: string): Promise<RoomCodeResult> {
  if (!UUID.test(id)) return { kind: "refused", reason: "closed" };
  try {
    const response = await rpc("web_room_code", { p_room_id: id.toLowerCase() });
    if (!response.ok) {
      switch (await errorMessage(response)) {
        case "room_full": return { kind: "refused", reason: "full" };
        case "room_closed":
        case "room_not_found": return { kind: "refused", reason: "closed" };
        case "web_codes_disabled":
        case "feature_disabled": return { kind: "refused", reason: "disabled" };
        default: return { kind: "error" };
      }
    }
    const code: unknown = await response.json();
    return typeof code === "string" && ROOM_CODE.test(code) ? { kind: "code", code } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

/** 隊列篩選：App 的四個常用分類，其餘都算「其他」。 */
export const QUEUE_FILTERS = ["competitive", "unrated", "swiftplay", "other"] as const;
export type QueueFilter = (typeof QUEUE_FILTERS)[number];

export function queueFilterOf(queue: string): QueueFilter {
  return (QUEUE_FILTERS as readonly string[]).includes(queue) ? (queue as QueueFilter) : "other";
}

export function isFull(room: ListedRoom): boolean {
  return room.memberCount >= 5;
}

const ROLE_UUIDS: Record<RoomRole, string> = {
  duelist: "dbe8757e-9e92-4ed4-b39f-9dfc589691d4",
  initiator: "1b47567f-8f7b-444b-aae3-b0c634622d10",
  controller: "4ee40330-ecdd-4f2f-98a8-eb1243428373",
  sentinel: "5fc02f99-4091-4486-a531-98459a3e95e9",
};

export function roleIconURL(role: RoomRole): string {
  return `https://media.valorant-api.com/agents/roles/${ROLE_UUIDS[role]}/displayicon.png`;
}

export function playerCardURL(cardId: string): string {
  return `https://media.valorant-api.com/playercards/${cardId}/smallart.png`;
}
