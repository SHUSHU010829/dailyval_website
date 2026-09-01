// 審核軌跡：做過什麼、對誰做的、什麼時候、理由是什麼。
//
// 三種來源，因為它們本來就是三種不同的東西，而且各自已經有完整的紀錄：
//   content — social.moderation_actions（下架 / 恢復 / 刪除 / 檢舉結案）
//   badges  — identity.badge_applications 上的審核欄位
//   bans    — identity.bans（發出與解除是同一列的兩個時間）
//
// 不把後兩種塞進 moderation_actions：那張表的 target_kind 只有 post/comment，
// 而一份申請和一個人都不是內容；硬塞會讓同一件事有兩份可以互相矛盾的紀錄。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { oneOf, pageParams, BadInput } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

const SOURCES = ["content", "badges", "bans"] as const;
const RPC: Record<(typeof SOURCES)[number], string> = {
  content: "admin_action_log",
  badges: "admin_badge_review_log",
  bans: "admin_ban_log",
};

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const url = new URL(request.url);
      const { limit, offset } = pageParams(url);
      const source = oneOf(url.searchParams.get("source") ?? "content", SOURCES, "source");
      const { data, error } = await adminDb().rpc(RPC[source], {
        p_admin_id: adminId,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) return rpcError(error);
      return Response.json({ items: data ?? [] });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
