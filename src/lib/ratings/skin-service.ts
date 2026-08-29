"use client";

// 造型評分的瀏覽器端讀寫（Supabase，schema=skins）。
// 規則承襲 esports/rating-service（iOS 同款教義）：
// - 每個寫入 RPC 都帶 p_expected_uid＝「互動當下」抓到的 uid；帳號在
//   半路換人時伺服器以 uid_mismatch 拒絕，寫入絕不會掛錯帳號
// - 錯誤一律經 classifyError 分類（伺服器錯誤字串是契約）
// - 冷卻由伺服器仲裁：投票 per-(user, skin) 30 秒、留言 user-wide
//   3 秒，client 只把 rate_limited 翻譯成 UI 提示

import { getSupabase } from "@/lib/esports/supabase-client";
import { EsportsServiceError } from "@/lib/esports/rating-service";
import { classifyError } from "@/lib/esports/errors";
import type { AggregateTotals } from "@/lib/ratings/leaderboard";
import {
  assembleComments,
  SKIN_COMMENTS_LIMIT,
  type SkinCommentData,
  type SkinCommentRow,
} from "@/lib/ratings/skin-comments";

/** 伺服器契約的冷卻秒數（UI 提示用；仲裁在伺服器） */
export const VOTE_COOLDOWN_SECONDS = 30;
export const COMMENT_COOLDOWN_SECONDS = 3;
export const COMMENT_TEXT_LIMIT = 500;

function skins() {
  return getSupabase().schema("skins");
}

function classify(error: unknown): EsportsServiceError {
  const input =
    error && typeof error === "object"
      ? (error as { message?: string; code?: string })
      : null;
  return new EsportsServiceError(classifyError(input));
}

// ---------- 已登入的讀取（RLS 只回自己的列） ----------

/** 我對這個造型的現有投票（1–5；沒投過為 null） */
export async function fetchMyRating(skinID: string): Promise<number | null> {
  const { data, error } = await skins()
    .from("ratings")
    .select("rating")
    .eq("skin_id", skinID);
  if (error) throw classify(error);
  return (data?.[0]?.rating as number | undefined) ?? null;
}

/** 這批留言裡我按過讚的 id */
export async function fetchMyLikedCommentIDs(commentIDs: string[]): Promise<string[]> {
  if (commentIDs.length === 0) return [];
  const { data, error } = await skins()
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", commentIDs);
  if (error) throw classify(error);
  return (data ?? []).map((row) => row.comment_id as string);
}

// ---------- 匿名讀取（寫入後的權威重讀） ----------

/** 單一造型的最新彙總（投票落地後重讀，取代就地 delta 的猜測） */
export async function fetchSkinAggregateLive(skinID: string): Promise<AggregateTotals | null> {
  const { data, error } = await skins()
    .from("rating_leaderboard")
    .select("rating_count,rating_sum")
    .eq("skin_id", skinID);
  if (error) return null;
  const row = data?.[0];
  if (!row) return null;
  return {
    ratingCount: row.rating_count as number,
    ratingSum: row.rating_sum as number,
  };
}

/** 整串留言重讀（發佈後刷新；伺服器擁有作者顯示與排序事實） */
export async function fetchSkinThread(skinID: string): Promise<SkinCommentData[] | null> {
  const { data, error } = await skins()
    .from("comments_public")
    .select("*")
    .eq("skin_id", skinID)
    .order("created_at", { ascending: false })
    .limit(SKIN_COMMENTS_LIMIT);
  if (error) return null;
  const rows = (data ?? []) as SkinCommentRow[];
  if (rows.length === 0) return [];

  const likeCounts = new Map<string, number>();
  const { data: likeRows, error: likeError } = await skins()
    .from("comment_like_counts")
    .select("comment_id,like_count")
    .in("comment_id", rows.map((row) => row.id));
  // 讚數讀掛了＝整次刷新作廢，不能把失敗組裝成「每則 0 讚」發布
  if (likeError) return null;
  for (const row of likeRows ?? []) {
    likeCounts.set(row.comment_id as string, row.like_count as number);
  }
  return assembleComments(rows, likeCounts);
}

// ---------- 寫入（全部帶互動當下的 expectedUID） ----------

export async function submitSkinRating(options: {
  skinID: string;
  value: number;
  expectedUID: string;
}): Promise<void> {
  const { error } = await skins().rpc("submit_rating", {
    p_skin_id: options.skinID,
    p_rating: options.value,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
}

/** 發佈留言，回傳伺服器配的留言 id */
export async function postSkinComment(options: {
  skinID: string;
  text: string;
  expectedUID: string;
}): Promise<string> {
  const { data, error } = await skins().rpc("post_comment", {
    p_skin_id: options.skinID,
    p_body: options.text,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
  return data as string;
}

/** SET 語意的按讚：回傳伺服器的權威 (liked, likeCount) 對 */
export async function setSkinCommentLike(options: {
  commentID: string;
  liked: boolean;
  expectedUID: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await skins().rpc("set_comment_like", {
    p_comment_id: options.commentID,
    p_liked: options.liked,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    liked: Boolean(row?.liked),
    likeCount: (row?.like_count as number | undefined) ?? 0,
  };
}

/** 刪除自己的留言。走 definer RPC（grant 矩陣不給 client 直接碰
 * comments 表——帶條件的直接 delete 需要 Postgres 從不授予的 SELECT），
 * 與其他寫入同一套守門梯：開關、登入、expectedUID、作者本人。 */
export async function deleteSkinComment(options: {
  commentID: string;
  expectedUID: string;
}): Promise<void> {
  const { error } = await skins().rpc("delete_comment", {
    p_comment_id: options.commentID,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
}

export async function reportSkinComment(options: {
  commentID: string;
  expectedUID: string;
}): Promise<void> {
  const { error } = await skins().rpc("report_comment", {
    p_comment_id: options.commentID,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
}
