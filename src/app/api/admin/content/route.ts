// 內容處置：下架 / 恢復 / 刪除。
//
// 刪除和下架刻意是不同的動作而不是同一支帶旗標:下架可逆、刪除不可逆,
// 後者要求理由,而且會在 social.import_tombstones 留碑,讓 A2 的補跑匯入
// 不會把管理員刪掉的東西當成舊資料插回來。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { BadInput, bool, jsonBody, oneOf, reason, targetKind, uuid } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const body = await jsonBody(request);
      const action = oneOf(body.action, ["hide", "delete"] as const, "action");
      const kind = targetKind(body.kind);
      const targetId = uuid(body.target_id, "target_id");

      if (action === "delete") {
        const { data, error } = await adminDb().rpc("admin_delete_content", {
          p_admin_id: adminId,
          p_kind: kind,
          p_target_id: targetId,
          // 不可逆,所以理由是必填。
          p_reason: reason(body.reason, { required: true }),
        });
        if (error) return rpcError(error);
        return Response.json({ ok: data === true });
      }

      const { data, error } = await adminDb().rpc("admin_set_hidden", {
        p_admin_id: adminId,
        p_kind: kind,
        p_target_id: targetId,
        p_hidden: bool(body.hidden, "hidden"),
        p_reason: reason(body.reason, { required: false }),
      });
      if (error) return rpcError(error);
      // false = 本來就是這個狀態。不是錯誤,但 UI 要知道別再顯示一次成功。
      return Response.json({ ok: true, changed: data === true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
