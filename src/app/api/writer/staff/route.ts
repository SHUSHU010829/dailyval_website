import { articlesDb, articlesRpcError, withStaff } from "@/lib/admin/articles/server";
import { displayNameInput, writerInput } from "@/lib/admin/articles/validate";
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

/** 改自己的署名（寫手或管理員）。 */
export async function PATCH(request: Request) {
  return withStaff(request, async (me) => {
    try {
      const name = displayNameInput(await jsonBody(request));
      const { error } = await articlesDb().rpc("staff_set_display_name", {
        p_actor_id: me.uid,
        p_display_name: name,
      });
      if (error) return articlesRpcError(error);
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
