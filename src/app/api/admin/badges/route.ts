// 藍勾勾申請的待審清單與裁決。
// 通過會寫 identity.profiles.is_verified——那個欄位只有這條路徑會寫，
// 而 CloudKit 時代它是客戶端可寫的，所以藍勾勾當時是可以偽造的。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { BadInput, bool, jsonBody, pageParams, reason, uuid } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"] as const;

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    const url = new URL(request.url);
    const { limit, offset } = pageParams(url);
    const status = url.searchParams.get("status") ?? "pending";
    if (!STATUSES.includes(status as (typeof STATUSES)[number]) && status !== "all") {
      return Response.json({ error: "unknown status" }, { status: 400 });
    }
    const { data, error } = await adminDb().rpc("admin_badge_queue", {
      p_admin_id: adminId,
      p_status: status === "all" ? null : status,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return rpcError(error);
    return Response.json({ items: data ?? [] });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const body = await jsonBody(request);
      const { data, error } = await adminDb().rpc("admin_review_badge", {
        p_admin_id: adminId,
        p_application_id: uuid(body.application_id, "application_id"),
        p_approve: bool(body.approve, "approve"),
        p_note: reason(body.note, { required: false }),
      });
      if (error) return rpcError(error);
      return Response.json({ ok: data === true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
