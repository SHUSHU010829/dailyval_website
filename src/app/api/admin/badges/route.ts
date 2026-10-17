// 藍勾勾申請的待審清單與裁決。
// 通過會寫 identity.profiles.is_verified——那個欄位只有這條路徑會寫，
// 而 CloudKit 時代它是客戶端可寫的，所以藍勾勾當時是可以偽造的。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import {
  BadInput,
  badgeQueueParams,
  bool,
  jsonBody,
  reason,
  uuid,
} from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    const url = new URL(request.url);
    // 退回理由的清單。後台拿它來畫按鈕,所以按鈕上寫的和存下來的是同一份資料。
    if (url.searchParams.get("reasons")) {
      const { data, error } = await adminDb().rpc("admin_rejection_reasons", {
        p_admin_id: adminId,
      });
      if (error) return rpcError(error);
      return Response.json({ items: data ?? [] });
    }
    // status 與 sort 都在 badgeQueueParams 裡驗。
    try {
      const params = badgeQueueParams(url);
      const { data, error } = await adminDb().rpc("admin_badge_queue", {
        p_admin_id: adminId,
        ...params,
      });
      if (error) return rpcError(error);
      return Response.json({ items: data ?? [] });
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
      const approve = bool(body.approve, "approve");
      // 代碼的合法範圍、以及固定理由那句話,都由資料庫決定。這裡不再拿一份
      // 清單來比對——比對的那一份會跟資料庫的分家,而分家的時候不會有人發現。
      const code =
        approve || typeof body.reason_code !== "string" ? null : body.reason_code;
      const { data, error } = await adminDb().rpc("admin_review_badge", {
        p_admin_id: adminId,
        p_application_id: uuid(body.application_id, "application_id"),
        p_approve: approve,
        // 固定理由的文字伺服器自己有,送上去也不算數;'other' 那一種才需要。
        p_note: reason(body.note, { required: false }),
        p_reason_code: code,
      });
      if (error) return rpcError(error);
      return Response.json({ ok: data === true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
