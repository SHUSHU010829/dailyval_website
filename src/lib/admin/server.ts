import "server-only";

// 後台的伺服器端關卡。這是整個網站第一條特權路徑——在此之前所有查詢都是
// 匿名 key + RLS，service_role 從來沒有出現過——所以它自己就是一個安全邊界。
//
// 兩件事必須在伺服器發生，而且順序不能反：
//   1. 驗 token（`auth.getUser` 會真的驗簽，不是解碼），拿到可信的 uid
//   2. 用 service_role 問 `social.is_admin(uid)`
// 客戶端送來的任何「我是 admin」都不算數；瀏覽器唯一能提供的是它的 token。
//
// 失敗一律 404，不是 403：403 等於告訴陌生人「這條路徑存在，你只是沒權限」。
//
// service_role key 只存在於這個模組（`server-only` 讓它一旦被 client
// component import 就會編譯失敗），而且永遠不會出現在回應裡。

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/esports/constants";

/** 呼叫端該回什麼。route 一律把它變成 404。 */
export class NotAdminError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "NotAdminError";
  }
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    // 沒設就整條路徑不可用。這比「靜靜地用匿名 key 去查然後永遠回空」好：
    // 後者看起來像「沒有待處理的檢舉」，而那正是最危險的誤讀。
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return key;
}

// 型別由 createClient 推導（schema 是型別參數，寫死 SupabaseClient 會把
// "social" 擦成 "public"，之後每支 rpc 呼叫都會對不起來）。
function createAdminClient() {
  return createClient(SUPABASE_URL, serviceKey(), {
    db: { schema: "social" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: ReturnType<typeof createAdminClient> | null = null;

/** service_role 客戶端。schema 固定 social——後台 RPC 都住在那裡。 */
export function adminDb(): ReturnType<typeof createAdminClient> {
  if (!cached) cached = createAdminClient();
  return cached;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * 驗證這個請求來自一個真的管理員，回傳可信的 uid。
 * 任何一步不過就丟 NotAdminError，呼叫端把它變成 404。
 */
export async function requireAdmin(request: Request): Promise<string> {
  const token = bearerToken(request);
  if (!token) throw new NotAdminError("no bearer token");

  // 用匿名 key 的 client 驗 token：getUser 會向 Supabase 驗簽並檢查有效期，
  // 不是在本地解 JWT。這一步的產物（uid）才是可信的。
  const auth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new NotAdminError("token did not verify");

  const { data: ok, error: rpcError } = await adminDb().rpc("is_admin", {
    p_user_id: data.user.id,
  });
  if (rpcError) throw new NotAdminError(`is_admin failed: ${rpcError.message}`);
  if (ok !== true) throw new NotAdminError("not in identity.admins");

  return data.user.id;
}

/**
 * route handler 的外殼。把 NotAdminError 變成 404,其餘錯誤變成 500,
 * 並且**永遠不把資料庫的錯誤訊息原文吐給瀏覽器**——那些字串會漏出 schema、
 * 欄位名甚至參數值。真正的原因進伺服器日誌。
 */
export async function withAdmin(
  request: Request,
  handler: (adminId: string) => Promise<Response>
): Promise<Response> {
  let adminId: string;
  try {
    adminId = await requireAdmin(request);
  } catch (err) {
    if (err instanceof NotAdminError) {
      console.warn("[admin] refused:", err.message);
      return new Response("Not Found", { status: 404 });
    }
    console.error("[admin] gate failed:", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  try {
    return await handler(adminId);
  } catch (err) {
    console.error("[admin] handler failed:", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * RPC 的錯誤有兩種：使用者做錯了（缺理由、目標不存在、已經審過），
 * 以及真的壞了。前者要讓後台顯示得出來,後者不能外洩。
 * 資料庫那一批全部用明確的 SQLSTATE,所以分得開。
 */
const USER_FACING_SQLSTATES = new Set([
  "22004", // 缺必要參數（沒寫理由、沒有可封的作者）
  "22023", // 不合法的參數值（未知的檢舉狀態）
  "23503", // 目標不存在 / 已經審過
]);

export function rpcError(error: { code?: string; message: string }): Response {
  if (error.code && USER_FACING_SQLSTATES.has(error.code)) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("[admin] rpc failed:", error);
  return Response.json({ error: "server_error" }, { status: 500 });
}
