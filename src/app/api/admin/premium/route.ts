// 送／收回 Premium。
//
// GET  ?user_id=  → 個人卡片上的會員區（現在的狀態 + 最近 20 次送／收回）
// POST            → 轉給 Supabase edge function admin-premium，它呼叫 RevenueCat
//
// RevenueCat 的 secret key 只在 edge function 的 secrets 裡，網站不持有。
// 轉過去帶的是管理員自己的 token（不是 service_role）：function 自己再驗一次
// token、再問一次 identity.admins，不必信任這條 route。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/esports/constants";
import { premiumChange, premiumResult } from "@/lib/admin/premium";
import { BadInput, jsonBody, uuid } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const url = new URL(request.url);
      const { data, error } = await adminDb().rpc("admin_premium_detail", {
        p_admin_id: adminId,
        p_user_id: uuid(url.searchParams.get("user_id"), "user_id"),
      });
      if (error) return rpcError(error);
      return Response.json(data);
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}

export async function POST(request: Request) {
  return withAdmin(request, async () => {
    let change;
    try {
      change = premiumChange(await jsonBody(request));
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
    // withAdmin 已經驗過這個 header，所以它一定在。
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-premium`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization")!,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(change),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const result = premiumResult(res.status, body);
    if (result.status === 500) console.error("[admin] admin-premium failed:", res.status, body);
    return Response.json(result.body, { status: result.status });
  });
}
