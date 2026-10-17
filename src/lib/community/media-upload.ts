"use client";

// 貼文配圖直傳 R2（iOS MediaUploadService 的對應）。
//
// 三段：向 media-upload 要一張票（key 由伺服器決定、簽好兩個短效的 PUT）→
// 瀏覽器把原圖與縮圖 PUT 到暫存 key → 請伺服器把這批搬到最終 key（promote）。
// 最終 key 從來沒有被簽給任何人，所以已發表的圖不可能被還沒過期的簽章換掉。
//
// 全有或全無：任何一張失敗整批就失敗，沒有列指向的物件由伺服器的 janitor
// 收回。少一張圖的貼文沒辦法事後補，「發成功了但照片不見了」比乾脆失敗糟。

import { FunctionsHttpError } from "@supabase/supabase-js";
import { POST_IMAGE_LIMIT } from "@/lib/community/constants";
import {
  SocialServiceError,
  type SocialErrorKind,
} from "@/lib/community/errors";
import type { PreparedImage } from "@/lib/community/image-compress";
import { getSupabase } from "@/lib/esports/supabase-client";

export type UploadScope = "post" | "comment";

export interface UploadedImage {
  position: number;
  /** 附到貼文上的是票，不是 key：票證明「是這個人把這些位元組傳到這篇底下」 */
  ticketId: string;
  objectKey: string;
  thumbKey: string;
  width: number;
  height: number;
  url: string;
  thumbURL: string;
}

interface PresignedUpload {
  url: string;
  headers: Record<string, string>;
}

interface TicketResponse {
  ticket_id: string;
  upload: PresignedUpload;
  thumb_upload: PresignedUpload;
}

interface PromoteResponse {
  images: Array<{
    position: number;
    object_key: string;
    thumb_key: string;
    url: string;
    thumb_url: string;
  }>;
}

// media-upload 用 HTTP 狀態碼加 {error} 回報；翻回社群板的錯誤分類
const FUNCTION_ERRORS: Record<string, SocialErrorKind> = {
  not_authenticated: "not_signed_in",
  uid_mismatch: "not_signed_in",
  user_banned: "banned",
  feature_disabled: "feature_disabled",
  rate_limited: "rate_limited",
  too_many_retries: "rate_limited",
  too_large: "invalid_image",
  unsupported_type: "invalid_image",
  key_taken: "invalid_image",
  target_exists: "invalid_image",
  tickets_unavailable: "invalid_image",
  // 搬到最終 key 失敗或撞到另一次升級：伺服器端的事，重試就好，不是圖片的問題
  promote_failed: "network",
  promotion_raced: "network",
};

async function classifyFunctionError(
  error: unknown,
): Promise<SocialServiceError> {
  if (error instanceof FunctionsHttpError) {
    let code = "";
    try {
      const body = (await error.context.json()) as { error?: string };
      code = typeof body?.error === "string" ? body.error : "";
    } catch {
      // 沒有 JSON body 就照狀態碼分
    }
    if (FUNCTION_ERRORS[code])
      return new SocialServiceError(FUNCTION_ERRORS[code], code);
    if (error.context.status === 401 || error.context.status === 403) {
      return new SocialServiceError("not_signed_in", code || undefined);
    }
    // 5xx 是伺服器或 R2 的問題，不是這張圖的問題：要讓人看到「稍後再試」，不是「圖片無效」
    if (error.context.status >= 500) {
      return new SocialServiceError(
        "network",
        code || `http_${error.context.status}`,
      );
    }
    return new SocialServiceError(
      "invalid_image",
      code || `http_${error.context.status}`,
    );
  }
  return new SocialServiceError("network");
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>(
    "media-upload",
    { body },
  );
  if (error) throw await classifyFunctionError(error);
  if (!data) throw new SocialServiceError("network");
  return data;
}

/** 簽章覆蓋了 Content-Type 與 Cache-Control，兩個都要原值帶上；Content-Length 瀏覽器自己算 */
async function putObject(blob: Blob, upload: PresignedUpload): Promise<void> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(upload.headers)) {
    if (name.toLowerCase() === "content-length") continue;
    headers[name] = value;
  }
  let response: Response;
  try {
    response = await fetch(upload.url, { method: "PUT", headers, body: blob });
  } catch {
    throw new SocialServiceError("network");
  }
  if (!response.ok) {
    // 403 是簽章對不上（改了標頭、票過期）；5xx 是儲存端的問題，可以重試
    throw new SocialServiceError(
      response.status >= 500 ? "network" : "invalid_image",
      `upload_rejected_${response.status}`,
    );
  }
}

interface Staged {
  position: number;
  ticketId: string;
  width: number;
  height: number;
}

async function stageOne(
  image: PreparedImage,
  scope: UploadScope,
  targetId: string,
  position: number,
  expectedUid: string,
): Promise<Staged> {
  const ticket = await invoke<TicketResponse>({
    action: "ticket",
    expected_uid: expectedUid,
    scope,
    target_id: targetId,
    position,
    content_type: "image/jpeg",
    bytes: image.original.size,
    thumb_bytes: image.thumbnail.size,
  });
  // 縮圖是動態牆真正會載的那一張，不是可以默默失敗的附屬品：兩張都要落地
  await Promise.all([
    putObject(image.original, ticket.upload),
    putObject(image.thumbnail, ticket.thumb_upload),
  ]);
  return {
    position,
    ticketId: ticket.ticket_id,
    width: image.width,
    height: image.height,
  };
}

export interface UploadImagesOptions {
  scope: UploadScope;
  /** 貼文／留言的 id，由客戶端在送出前產生 */
  targetId: string;
  expectedUid: string;
}

export async function uploadImages(
  images: PreparedImage[],
  options: UploadImagesOptions,
): Promise<UploadedImage[]> {
  if (images.length === 0) return [];
  const limit = options.scope === "post" ? POST_IMAGE_LIMIT : 1;
  if (images.length > limit) throw new SocialServiceError("too_many_images");

  const staged = await Promise.all(
    images.map((image, position) =>
      stageOne(
        image,
        options.scope,
        options.targetId,
        position,
        options.expectedUid,
      ),
    ),
  );

  const promoted = await invoke<PromoteResponse>({
    action: "promote",
    expected_uid: options.expectedUid,
    scope: options.scope,
    target_id: options.targetId,
    ticket_ids: staged.map((item) => item.ticketId),
  });
  const bySlot = new Map(
    promoted.images.map((image) => [image.position, image]),
  );

  return staged.map((item) => {
    const image = bySlot.get(item.position);
    // 伺服器搬的比我們傳的少：現在發表會引用一個背後什麼都沒有的 key
    if (!image)
      throw new SocialServiceError(
        "invalid_image",
        "promoted_fewer_than_staged",
      );
    return {
      position: item.position,
      ticketId: item.ticketId,
      objectKey: image.object_key,
      thumbKey: image.thumb_key,
      width: item.width,
      height: item.height,
      url: image.url,
      thumbURL: image.thumb_url,
    };
  });
}
