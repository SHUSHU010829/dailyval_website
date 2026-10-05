// 審核軌跡：做過什麼、對誰做的、什麼時候、理由是什麼。
//
// 四種來源，因為它們本來就是四種不同的東西，而且各自已經有完整的紀錄：
//   content — social.moderation_actions（下架 / 恢復 / 刪除 / 檢舉結案）
//   badges  — identity.badge_applications 上的審核欄位
//   bans    — identity.bans（發出與解除是同一列的兩個時間）
//   premium — identity.premium_grants（送／收回 Premium，一列一次 RevenueCat 請求）
//
// 不把後三種塞進 moderation_actions：那張表的 target_kind 只收內容（貼文、
// 留言、房間、造型留言、電競留言，見 @/lib/admin/targetKind），而一份申請和
// 一個人都不是內容；硬塞會讓同一件事有兩份可以互相矛盾的紀錄。

import { adminDb, rpcError, withAdmin } from "@/lib/admin/server";
import { oneOf, pageParams, BadInput } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

const SOURCES = ["content", "badges", "bans", "premium"] as const;
/** moderation_actions.action 寫得出來的值。 */
const CONTENT_ACTIONS = [
  "hide", "unhide", "delete", "report:actioned", "report:dismissed", "report:open",
];

const RPC: Record<(typeof SOURCES)[number], string> = {
  content: "admin_action_log",
  badges: "admin_badge_review_log",
  bans: "admin_ban_log",
  premium: "admin_premium_log",
};

export async function GET(request: Request) {
  return withAdmin(request, async (adminId) => {
    try {
      const url = new URL(request.url);
      const { limit, offset } = pageParams(url);
      const source = oneOf(url.searchParams.get("source") ?? "content", SOURCES, "source");
      const action = url.searchParams.get("action");
      if (action && !CONTENT_ACTIONS.includes(action)) {
        return Response.json({ error: "unknown action" }, { status: 400 });
      }
      const { data, error } = await adminDb().rpc(RPC[source], {
        p_admin_id: adminId,
        p_limit: limit,
        p_offset: offset,
        // 只有內容那一種紀錄有「處置結果」可以篩；另外兩種每一列本來就是
        // 一種結果（通過/退回、封禁/解除）。
        ...(source === "content" ? { p_action: action || null } : {}),
      });
      if (error) return rpcError(error);
      return Response.json({ items: data ?? [] });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
