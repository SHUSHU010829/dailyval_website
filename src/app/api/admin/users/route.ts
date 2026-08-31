// 使用者檢視與封禁。
//
// 封禁掛在身分上（identity.bans），每一條寫入路徑都會問 identity.is_banned。
// 還沒被認領的舊內容沒有 author_id，所以它的作者封不了——資料庫會明講，
// 這裡把那句話原樣轉給 UI（它是 22004，屬於「使用者做錯了」那一類）。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import {
  BadInput,
  jsonBody,
  oneOf,
  optionalTimestamp,
  reason,
  uuid,
} from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const url = new URL(request.url);
      const { data, error } = await adminDb().rpc("admin_user_detail", {
        p_admin_id: adminId,
        p_user_id: uuid(url.searchParams.get("user_id"), "user_id"),
      });
      if (error) return rpcError(error);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return Response.json({ error: "no such user" }, { status: 404 });
      return Response.json(row);
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}

export async function POST(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const body = await jsonBody(request);
      const action = oneOf(body.action, ["ban", "lift"] as const, "action");
      const userId = uuid(body.user_id, "user_id");

      if (action === "lift") {
        const { data, error } = await adminDb().rpc("admin_lift_ban", {
          p_admin_id: adminId,
          p_user_id: userId,
        });
        if (error) return rpcError(error);
        return Response.json({ ok: true, lifted: data ?? 0 });
      }

      const { data, error } = await adminDb().rpc("admin_ban_user", {
        p_admin_id: adminId,
        p_user_id: userId,
        p_reason: reason(body.reason, { required: true }),
        // null = 永久。刻意的選項，不是漏填。
        p_expires_at: optionalTimestamp(body.expires_at, "expires_at"),
      });
      if (error) return rpcError(error);
      return Response.json({ ok: true, ban_id: data });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
