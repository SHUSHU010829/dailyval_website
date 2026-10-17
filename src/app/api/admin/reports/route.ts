// 檢舉佇列：讀取待處理清單，以及結案。
// 權限只在伺服器判斷（見 @/lib/admin/server），失敗一律 404。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import {
  BadInput,
  jsonBody,
  oneOf,
  reason,
  reportQueueParams,
  targetKind,
  uuid,
} from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

// 讀取用的篩選值（REPORT_STATUSES，在 validate.ts）和結案用的目標值不是同一組。
// 'open' 是一個合法的篩選條件，但不是一個合法的結案結果：以目標為單位結案到
// 'open'，等於把那個目標上所有已經判斷過的檢舉一次全部重開。
const RESOLUTIONS = ["actioned", "dismissed"] as const;

// status、sort、kinds 都在 reportQueueParams 裡驗。kinds 篩過之後，
// total_targets 是篩過的總數，分頁照它算。
export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const params = reportQueueParams(new URL(request.url));
      const { data, error } = await adminDb().rpc("admin_report_queue", {
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

// 結案的單位是內容，不是檢舉。一篇被檢舉 18 次的貼文只需要一個判斷，
// 而 18 筆檢舉要一起關掉，否則下次打開佇列它還在。
export async function PATCH(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const body = await jsonBody(request);
      const { data, error } = await adminDb().rpc("admin_resolve_target", {
        p_admin_id: adminId,
        p_kind: targetKind(body.kind),
        p_target_id: uuid(body.target_id, "target_id"),
        p_status: oneOf(body.status, RESOLUTIONS, "status"),
        p_note: reason(body.note, { required: false }),
      });
      if (error) return rpcError(error);
      // 0 是正常結果，不是失敗：刪除會連檢舉一起帶走，之後再按結案就是 0。
      return Response.json({ ok: true, closed: data ?? 0 });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
