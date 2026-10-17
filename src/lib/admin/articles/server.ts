import "server-only";

// 文章後台的伺服器端關卡。跟 ../server.ts 的 requireAdmin 同一道門：
//   1. 驗 token（trustedUserId，會真的驗簽），拿到可信的 uid
//   2. 用 service_role 問 articles.staff_me(uid)：管理員、寫手、還是誰都不是
// 兩者都不是就 404——跟後台其他路徑一樣，不告訴陌生人這裡有東西。
//
// service_role key 只從 ../server.ts 的 serviceKey() 拿，這個檔案有
// server-only，client component 一 import 就編譯失敗。

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/esports/constants";
import { NotAdminError, serviceKey, trustedUserId } from "@/lib/admin/server";
import type { StaffMe } from "./types";

export class NotStaffError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "NotStaffError";
  }
}

// schema 是型別參數，寫死 SupabaseClient 會把 "articles" 擦成 "public"。
function createArticlesClient() {
  return createClient(SUPABASE_URL, serviceKey(), {
    db: { schema: "articles" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: ReturnType<typeof createArticlesClient> | null = null;

/** service_role 客戶端，schema 固定 articles。 */
export function articlesDb(): ReturnType<typeof createArticlesClient> {
  if (!cached) cached = createArticlesClient();
  return cached;
}

/**
 * 驗證這個請求來自管理員或啟用中的寫手，回傳可信的身分。
 * 任何一步不過就丟 NotStaffError / NotAdminError，呼叫端把它變成 404。
 */
export async function requireStaff(request: Request): Promise<StaffMe> {
  const uid = await trustedUserId(request);
  const { data, error } = await articlesDb().rpc("staff_me", { p_user_id: uid });
  if (error) throw new NotStaffError(`staff_me failed: ${error.message}`);
  const row = (data ?? {}) as { role?: unknown; display_name?: unknown; profile_url?: unknown };
  if (row.role !== "admin" && row.role !== "writer") {
    throw new NotStaffError("not a writer");
  }
  return {
    uid,
    role: row.role,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    profile_url: typeof row.profile_url === "string" ? row.profile_url : null,
  };
}

/**
 * route handler 的外殼。身分不過 → 404，其餘錯誤 → 500，而且永遠不把
 * 資料庫的錯誤原文吐給瀏覽器。
 */
export async function withStaff(
  request: Request,
  handler: (me: StaffMe) => Promise<Response>
): Promise<Response> {
  let me: StaffMe;
  try {
    me = await requireStaff(request);
  } catch (err) {
    if (err instanceof NotAdminError || err instanceof NotStaffError) {
      console.warn("[articles] refused:", err.message);
      return new Response("Not Found", { status: 404 });
    }
    console.error("[articles] gate failed:", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  try {
    return await handler(me);
  } catch (err) {
    console.error("[articles] handler failed:", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * RPC 的錯誤分三種：你做錯了（22023 帶代號、23503 沒這篇）、你不能
 * （42501：寫手碰管理員的事）、真的壞了。前兩種的訊息是代號，後台翻成
 * 中文；第三種只進日誌。
 */
export function articlesRpcError(error: { code?: string; message: string }): Response {
  if (error.code === "22023" || error.code === "23503") {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error.code === "42501") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  console.error("[articles] rpc failed:", error);
  return Response.json({ error: "server_error" }, { status: 500 });
}
