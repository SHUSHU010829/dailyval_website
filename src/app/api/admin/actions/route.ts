// 審核軌跡：做過什麼、對誰做的、什麼時候、理由是什麼。
//
// moderation_actions 一直有在寫，但在這條路徑出現之前沒有任何地方讀得到它，
// 所以「我上週處理過什麼」只存在資料庫裡。刪除尤其需要它——那是唯一一種
// 處置完之後，被處置的東西就不在了的操作。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { pageParams } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    const { limit, offset } = pageParams(new URL(request.url));
    const { data, error } = await adminDb().rpc("admin_action_log", {
      p_admin_id: adminId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return rpcError(error);
    return Response.json({ items: data ?? [] });
  });
}
