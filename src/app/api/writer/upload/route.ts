import { randomUUID } from "node:crypto";
import { withStaff } from "@/lib/admin/articles/server";
import { publicURL, putObject, r2ConfigFromEnv } from "@/lib/admin/articles/r2";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, sniffImageType } from "@/lib/admin/articles/validate";

export const dynamic = "force-dynamic";

/**
 * 文章圖片上傳：multipart 的 file 欄位 → R2 的 articles/<年>/<月>/<uuid>.<副檔名>。
 * 副檔名由伺服器從實際內容推出，客戶端沒有命名權；Content-Type 也是。
 * 回 { url }，寫手把它貼進封面或內文。
 */
export async function POST(request: Request) {
  return withStaff(request, async () => {
    const cfg = r2ConfigFromEnv();
    if (!cfg) return Response.json({ error: "upload_not_configured" }, { status: 503 });

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "body must be multipart/form-data" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "too_large" }, { status: 413 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    const ext = type ? IMAGE_TYPES[type] : undefined;
    if (!type || !ext) return Response.json({ error: "unsupported_type" }, { status: 415 });

    const now = new Date();
    const key = `articles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
    const put = await putObject(cfg, key, bytes, type);
    if (!put.ok) {
      console.error("[articles] R2 put failed:", put.status, put.error);
      return Response.json({ error: "server_error" }, { status: 502 });
    }
    return Response.json({ url: publicURL(cfg, key) });
  });
}
