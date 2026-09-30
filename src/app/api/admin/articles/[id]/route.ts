import { articlesDb, articlesRpcError, withStaff } from "@/lib/admin/articles/server";
import { articlePatch } from "@/lib/admin/articles/validate";
import { BadInput, jsonBody, uuid } from "@/lib/admin/validate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 編輯器打開一篇（含內文）。不是你的 → 404。 */
export async function GET(request: Request, { params }: Params) {
  return withStaff(request, async (me) => {
    try {
      const id = uuid((await params).id, "id");
      const { data, error } = await articlesDb().rpc("staff_get", { p_actor_id: me.uid, p_id: id });
      if (error) return articlesRpcError(error);
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return new Response("Not Found", { status: 404 });
      return Response.json(row);
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}

/** 發布／撤回（status），或下架／恢復（hidden，管理員）。 */
export async function PATCH(request: Request, { params }: Params) {
  return withStaff(request, async (me) => {
    try {
      const id = uuid((await params).id, "id");
      const change = articlePatch(await jsonBody(request));
      const { data, error } =
        change.kind === "status"
          ? await articlesDb().rpc("staff_set_status", {
              p_actor_id: me.uid,
              p_id: id,
              p_status: change.status,
            })
          : await articlesDb().rpc("admin_set_hidden", {
              p_actor_id: me.uid,
              p_id: id,
              p_hidden: change.hidden,
            });
      if (error) return articlesRpcError(error);
      return Response.json({ changed: data === true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}

/** 刪除：寫手只能刪自己的草稿；管理員什麼都能刪。 */
export async function DELETE(request: Request, { params }: Params) {
  return withStaff(request, async (me) => {
    try {
      const id = uuid((await params).id, "id");
      const { error } = await articlesDb().rpc("staff_delete", { p_actor_id: me.uid, p_id: id });
      if (error) return articlesRpcError(error);
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof BadInput) return Response.json({ error: err.message }, { status: 400 });
      throw err;
    }
  });
}
