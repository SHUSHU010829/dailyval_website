"use client";

// 社群板的瀏覽器端讀寫（iOS SocialBoardService 的對應）。規則承襲 iOS：
// - 讀取帶著 session 一起送，伺服器同一趟就把「我按過讚沒有」「我檢舉過沒有」
//   跟依觀看者而定的封鎖過濾算好
// - 每個寫入 RPC 都帶 p_expected_uid＝「互動當下」抓到的 uid；帳號在半路換人
//   時伺服器以 uid_mismatch 拒絕，排隊中的寫入絕不會掛錯帳號
// - 可空參數（p_kind、p_reason、p_ticket_id、p_before…）一律是「明確的 JSON
//   null」：JS 的 undefined 會把 key 整個丟掉，PostgREST 就找不到同一個函式簽名
//   （iOS 第一次模擬器測試就是這樣撞到 PGRST202）
// - 錯誤一律經 classifyError 分類（伺服器錯誤字串是契約）

import { getSupabase } from "@/lib/esports/supabase-client";
import { COMMENTS_PAGE_SIZE, FEED_PAGE_SIZE } from "@/lib/community/constants";
import { classifyError, SocialServiceError } from "@/lib/community/errors";
import {
  commentFromRow,
  isUUID,
  postFromRow,
  profileFromRow,
} from "@/lib/community/mapping";
import type {
  AuthorProfile,
  AuthorProfileRow,
  CommentReactionRow,
  CommentReactionState,
  CommentRow,
  FeedCursor,
  PostReactionRow,
  PostReactionState,
  PostRow,
  ReactionKind,
  SocialComment,
  SocialPost,
  TargetKind,
} from "@/lib/community/types";
import type { UploadedImage } from "@/lib/community/media-upload";

// 與官網其他功能共用同一顆 client（同一把 session），只切到 social schema
function social() {
  return getSupabase().schema("social");
}

async function rpc<T>(
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await social().rpc(name, params);
  if (error) throw classifyError(error);
  return data as T;
}

function reaction(raw: string | null | undefined): ReactionKind | null {
  return raw === "like" || raw === "dislike" ? raw : null;
}

// ---------- 讀取（帶 session；匿名時退化成公開視角） ----------

export async function feedPage(
  before: FeedCursor | null,
  limit = FEED_PAGE_SIZE,
): Promise<SocialPost[]> {
  const rows = await rpc<PostRow[]>("feed", {
    p_before: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: limit,
  });
  return (rows ?? []).map(postFromRow);
}

/** 單篇；不存在、被下架、或作者被觀看者封鎖都回 null（客戶端沒有理由分辨） */
export async function postDetail(id: string): Promise<SocialPost | null> {
  if (!isUUID(id)) return null;
  const rows = await rpc<PostRow[]>("post_detail", { p_post_id: id });
  return rows?.[0] ? postFromRow(rows[0]) : null;
}

/** 討論串由舊到新，游標往後翻 */
export async function commentsPage(
  postId: string,
  after: FeedCursor | null,
  limit = COMMENTS_PAGE_SIZE,
): Promise<SocialComment[]> {
  const rows = await rpc<CommentRow[]>("post_comments", {
    p_post_id: postId,
    p_after: after?.createdAt ?? null,
    p_after_id: after?.id ?? null,
    p_limit: limit,
  });
  return (rows ?? []).map(commentFromRow);
}

/** 個人頁表頭（自己也走這支：客戶端本來就知道自己的 uid） */
export async function authorProfile(id: string): Promise<AuthorProfile | null> {
  if (!isUUID(id)) return null;
  const rows = await rpc<AuthorProfileRow[]>("author_profile", {
    p_author_id: id,
  });
  return rows?.[0] ? profileFromRow(rows[0]) : null;
}

export async function authorPosts(
  id: string,
  before: FeedCursor | null,
  limit = FEED_PAGE_SIZE,
): Promise<SocialPost[]> {
  if (!isUUID(id)) return [];
  const rows = await rpc<PostRow[]>("author_posts", {
    p_author_id: id,
    p_before: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: limit,
  });
  return (rows ?? []).map(postFromRow);
}

// ---------- 寫入 ----------

export interface CreatePostInput {
  /** 由客戶端在上傳圖片之前產生：圖片的 key 排在它底下，重送同一個 id 是冪等的 */
  id: string;
  body: string;
  images: UploadedImage[];
  expectedUid: string;
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const stored = await rpc<string>("create_post", {
    p_post_id: input.id,
    p_body: input.body,
    // position 不從這裡讀，伺服器讀票上的；寬高只是顯示用
    p_images: input.images.map((image) => ({
      ticket: image.ticketId,
      width: image.width,
      height: image.height,
    })),
    p_expected_uid: input.expectedUid,
  });
  return stored;
}

export async function deletePost(
  id: string,
  expectedUid: string,
): Promise<void> {
  await rpc<null>("delete_post", {
    p_post_id: id,
    p_expected_uid: expectedUid,
  });
}

export interface CreateCommentInput {
  id: string;
  postId: string;
  body: string;
  /** 網頁版留言目前不帶圖，但參數必須明送 null */
  ticketId: string | null;
  expectedUid: string;
}

export async function createComment(
  input: CreateCommentInput,
): Promise<string> {
  return rpc<string>("create_comment", {
    p_comment_id: input.id,
    p_post_id: input.postId,
    p_body: input.body,
    p_ticket_id: input.ticketId,
    p_expected_uid: input.expectedUid,
  });
}

export async function deleteComment(
  id: string,
  expectedUid: string,
): Promise<void> {
  await rpc<null>("delete_comment", {
    p_comment_id: id,
    p_expected_uid: expectedUid,
  });
}

/** SET 語意不是 toggle：kind 傳 null 代表收回。回傳的是伺服器算好的權威計數。 */
export async function setPostReaction(
  postId: string,
  kind: ReactionKind | null,
  expectedUid: string,
): Promise<PostReactionState> {
  const rows = await rpc<PostReactionRow[]>("set_post_reaction", {
    p_post_id: postId,
    p_kind: kind,
    p_expected_uid: expectedUid,
  });
  const row = rows?.[0];
  if (!row) throw new SocialServiceError("post_not_found");
  return {
    likeCount: row.like_count,
    dislikeCount: row.dislike_count ?? 0,
    mine: reaction(row.my_kind),
  };
}

export async function setCommentReaction(
  commentId: string,
  kind: ReactionKind | null,
  expectedUid: string,
): Promise<CommentReactionState> {
  const rows = await rpc<CommentReactionRow[]>("set_comment_reaction", {
    p_comment_id: commentId,
    p_kind: kind,
    p_expected_uid: expectedUid,
  });
  const row = rows?.[0];
  if (!row) throw new SocialServiceError("comment_not_found");
  return { likeCount: row.like_count, mine: reaction(row.my_kind) };
}

/** 重複檢舉是靜默成功：第二次按下去要看到的是「已收到」，不是紅字 */
export async function reportContent(
  kind: TargetKind,
  targetId: string,
  expectedUid: string,
  reason: string | null = null,
): Promise<void> {
  await rpc<null>("report_content", {
    p_kind: kind,
    p_target_id: targetId,
    p_reason: reason,
    p_expected_uid: expectedUid,
  });
}

/**
 * 封鎖「這篇的作者」而不是一個作者 id：認領前的作者只有 CloudKit 鑰匙，
 * 那把鑰匙不出海，所以客戶端指內容、伺服器反解作者。回傳封鎖列的 id。
 */
export async function blockAuthor(
  kind: TargetKind,
  targetId: string,
  expectedUid: string,
): Promise<string> {
  return rpc<string>("block_author", {
    p_kind: kind,
    p_target_id: targetId,
    p_expected_uid: expectedUid,
  });
}
