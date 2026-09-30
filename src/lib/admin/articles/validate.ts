// /api/admin/articles/* 收到的東西全部經過這裡。跟 ../validate.ts 同一個
// 精神：資料庫那一批對每個壞輸入都有明確的代號，但在這裡擋掉可以省一次
// 往返。沒有 server-only，所以測得到。

import { BadInput, bool, oneOf, uuid } from "@/lib/admin/validate";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_LANGS,
  ARTICLE_STATUSES,
  type ArticleDraft,
} from "./types";

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function text(value: unknown, field: string, max: number, { required }: { required: boolean }): string {
  if (value === undefined || value === null) {
    if (required) throw new BadInput(`${field} is required`);
    return "";
  }
  if (typeof value !== "string") throw new BadInput(`${field} must be text`);
  if (required && value.trim() === "") throw new BadInput(`${field} is required`);
  if (value.length > max) throw new BadInput(`${field} is too long (${max} max)`);
  return value;
}

/** 編輯器送來的一篇 → staff_save 的參數（少了 p_actor_id）。 */
export function articleDraft(body: Record<string, unknown>): {
  p_id: string | null;
  p_slug: string;
  p_title: string;
  p_summary: string;
  p_body_md: string;
  p_cover_url: string | null;
  p_category: ArticleDraft["category"];
  p_lang: ArticleDraft["lang"];
} {
  const id = body.id === undefined || body.id === null || body.id === "" ? null : uuid(body.id, "id");
  const slug = text(body.slug, "slug", 80, { required: true }).trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3) {
    throw new BadInput("invalid_slug");
  }
  const cover = text(body.cover_url, "cover_url", 500, { required: false }).trim();
  if (cover !== "" && !/^https:\/\/\S+$/.test(cover)) {
    throw new BadInput("invalid_cover_url");
  }
  return {
    p_id: id,
    p_slug: slug,
    p_title: text(body.title, "title", 120, { required: true }).trim(),
    p_summary: text(body.summary, "summary", 300, { required: false }).trim(),
    p_body_md: text(body.body_md, "body_md", 60000, { required: false }),
    p_cover_url: cover === "" ? null : cover,
    p_category: oneOf(body.category, ARTICLE_CATEGORIES, "category"),
    p_lang: oneOf(body.lang, ARTICLE_LANGS, "lang"),
  };
}

/** PATCH /api/admin/articles/[id]：只認 status 或 hidden 其中一個。 */
export function articlePatch(body: Record<string, unknown>):
  | { kind: "status"; status: (typeof ARTICLE_STATUSES)[number] }
  | { kind: "hidden"; hidden: boolean } {
  if (body.status !== undefined) {
    return { kind: "status", status: oneOf(body.status, ARTICLE_STATUSES, "status") };
  }
  if (body.hidden !== undefined) {
    return { kind: "hidden", hidden: bool(body.hidden, "hidden") };
  }
  throw new BadInput("nothing to change");
}

/** PUT /api/admin/articles/writers：管理員加人或改人。 */
export function writerInput(body: Record<string, unknown>): {
  p_user_id: string;
  p_display_name: string;
  p_active: boolean;
  p_note: string | null;
} {
  const note = text(body.note, "note", 500, { required: false }).trim();
  return {
    p_user_id: uuid(body.user_id, "user_id"),
    p_display_name: text(body.display_name, "display_name", 40, { required: true }).trim(),
    p_active: body.active === undefined ? true : bool(body.active, "active"),
    p_note: note === "" ? null : note,
  };
}

/** PATCH /api/admin/articles/writers：寫手改自己的署名。 */
export function displayNameInput(body: Record<string, unknown>): string {
  return text(body.display_name, "display_name", 40, { required: true }).trim();
}

/** 上傳的圖片：型別白名單 + 大小上限。魔術數字在 route 裡再驗一次。 */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
/** Vercel 的請求上限是 4.5 MB，留一點餘裕給 multipart 的外殼。 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** 看前幾個位元組是不是它自稱的格式。回 null = 對不上。 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  return null;
}
