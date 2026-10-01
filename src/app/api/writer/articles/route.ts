import { articlesDb, articlesRpcError, withStaff } from "@/lib/admin/articles/server";
import { articleDraft } from "@/lib/admin/articles/validate";
import { BadInput, jsonBody, pageParams } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

/** 我的文章（管理員：全部），最近改過的在前。 */
export async function GET(request: Request) {
  return withStaff(request, async (me) => {
    const { limit, offset } = pageParams(new URL(request.url));
    const { data, error } = await articlesDb().rpc("staff_list", {
      p_actor_id: me.uid,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return articlesRpcError(error);
    return Response.json({ items: data ?? [] });
  });
}

/** 存檔：id 空 = 新文章。回那一篇的 id。 */
export async function POST(request: Request) {
  return withStaff(request, async (me) => {
    try {
      const params = articleDraft(await jsonBody(request));
      const { data, error } = await articlesDb().rpc("staff_save", { p_actor_id: me.uid, ...params });
      if (error) return articlesRpcError(error);
      return Response.json({ id: data });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
