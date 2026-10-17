import { withStaff } from "@/lib/admin/articles/server";

export const dynamic = "force-dynamic";

/** 這個 session 是誰。不是寫手也不是管理員 → 404（withStaff 決定）。 */
export async function GET(request: Request) {
  return withStaff(request, async (me) => Response.json(me));
}
