import { articlesDb, articlesRpcError, withStaff } from "@/lib/admin/articles/server";
import { bylineInput, writerInput } from "@/lib/admin/articles/validate";
import { BadInput, jsonBody } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

/** 寫手名單（管理員）。寫手呼叫會被 RPC 擋成 42501 → 403。 */
export async function GET(request: Request) {
  return withStaff(request, async (me) => {
    const { data, error } = await articlesDb().rpc("admin_list_writers", { p_actor_id: me.uid });
    if (error) return articlesRpcError(error);
    return Response.json({ items: data ?? [] });
  });
}

/** 加人或改人（管理員）。 */
export async function PUT(request: Request) {
  return withStaff(request, async (me) => {
    try {
      const params = writerInput(await jsonBody(request));
      const { error } = await articlesDb().rpc("admin_set_writer", { p_actor_id: me.uid, ...params });
      if (error) return articlesRpcError(error);
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}

/** 改自己的署名和作者網址（寫手或管理員）。 */
export async function PATCH(request: Request) {
  return withStaff(request, async (me) => {
    try {
      const input = bylineInput(await jsonBody(request));
      const { error } =
        input.kind === "byline"
          ? await articlesDb().rpc("staff_set_byline", {
              p_actor_id: me.uid,
              p_display_name: input.p_display_name,
              p_profile_url: input.p_profile_url,
            })
          : await articlesDb().rpc("staff_set_display_name", {
              p_actor_id: me.uid,
              p_display_name: input.p_display_name,
            });
      if (error) return articlesRpcError(error);
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
