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
      // 兩種鑰匙。認領之前**每一個**違規者都只有 legacy_ck_user，所以只吃
      // uuid 的查詢在遷移期間等於查不到任何真正需要查的人。
      const legacy = url.searchParams.get("legacy_ck_user");
      const userId = url.searchParams.get("user_id");
      if (!legacy && !userId) {
        return Response.json({ error: "user_id or legacy_ck_user required" }, { status: 400 });
      }
      const { data, error } = await adminDb().rpc("admin_person_detail", {
        p_admin_id: adminId,
        p_user_id: userId ? uuid(userId, "user_id") : null,
        p_legacy_ck_user: legacy || null,
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
