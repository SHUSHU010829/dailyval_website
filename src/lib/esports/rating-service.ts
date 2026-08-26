"use client";

// EsportsRatingService（iOS）的瀏覽器端對應：登入後的讀寫都在這裡。
// 規則承襲 iOS：
// - 每個寫入 RPC 都帶 p_expected_uid＝「互動當下」抓到的 uid；帳號在
//   半路換人時伺服器以 uid_mismatch 拒絕，排隊中的寫入絕不會掛錯帳號
// - post_comment 的可空參數必須是「明確的 JSON null」——JS 的
//   undefined 會把 key 整個丟掉，PostgREST 就解析不到同一個函數簽名
// - 錯誤一律經 classifyError 分類（伺服器錯誤字串是契約）

import { getSupabase } from "@/lib/esports/supabase-client";
import { classifyError, type EsportsRatingError } from "@/lib/esports/errors";
import type { ProfileRow } from "@/lib/esports/types";

export class EsportsServiceError extends Error {
  readonly kind: EsportsRatingError;
  constructor(kind: EsportsRatingError) {
    super(kind);
    this.kind = kind;
  }
}

function classify(error: unknown): EsportsServiceError {
  const input =
    error && typeof error === "object"
      ? (error as { message?: string; code?: string })
      : null;
  return new EsportsServiceError(classifyError(input));
}

// ---------- Auth ----------

export interface EsportsAuthState {
  uid: string;
  email: string | null;
}

export async function signInWithAppleIdToken(
  idToken: string,
  rawNonce: string
): Promise<EsportsAuthState> {
  const { data, error } = await getSupabase().auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce: rawNonce,
  });
  if (error || !data.user) throw classify(error);
  return { uid: data.user.id, email: data.user.email ?? null };
}

export async function signOut(): Promise<void> {
  // 本地 session 一定清掉；伺服器端撤銷失敗不擋登出
  await getSupabase().auth.signOut().catch(() => {});
}

export async function currentUID(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------- 已登入的讀取（RLS 只回自己的列） ----------

export interface MyVotes {
  matchScore: number | null;
  playerScores: Record<string, number>;
}

export async function myVotes(riotMatchID: string): Promise<MyVotes> {
  const supabase = getSupabase();
  const [playerVotes, matchVotes] = await Promise.all([
    supabase
      .from("player_votes")
      .select("player_key,score")
      .eq("riot_match_id", riotMatchID),
    supabase.from("match_votes").select("score").eq("riot_match_id", riotMatchID),
  ]);
  if (playerVotes.error) throw classify(playerVotes.error);
  if (matchVotes.error) throw classify(matchVotes.error);

  const playerScores: Record<string, number> = {};
  for (const row of playerVotes.data ?? []) {
    playerScores[row.player_key as string] = row.score as number;
  }
  return {
    matchScore: (matchVotes.data?.[0]?.score as number | undefined) ?? null,
    playerScores,
  };
}

export async function myProfile(uid: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id,display_name,avatar_card_id")
    .eq("id", uid);
  if (error) throw classify(error);
  return (data?.[0] as ProfileRow | undefined) ?? null;
}

export async function profilesByIds(ids: string[]): Promise<ProfileRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id,display_name,avatar_card_id")
    .in("id", ids);
  if (error) throw classify(error);
  return (data ?? []) as ProfileRow[];
}

export async function myBlockedIDs(): Promise<string[]> {
  const { data, error } = await getSupabase().from("blocked_users").select("blocked_id");
  if (error) throw classify(error);
  return (data ?? []).map((row) => row.blocked_id as string);
}

export async function myLikedCommentIDs(commentIDs: string[]): Promise<string[]> {
  if (commentIDs.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", commentIDs);
  if (error) throw classify(error);
  return (data ?? []).map((row) => row.comment_id as string);
}

// ---------- 寫入 RPC（全部帶 p_expected_uid） ----------

export async function castMatchVote(
  riotMatchID: string,
  score: number,
  expectedUID: string
): Promise<void> {
  const { error } = await getSupabase().rpc("cast_match_vote", {
    p_riot_match_id: riotMatchID,
    p_score: score,
    p_expected_uid: expectedUID,
  });
  if (error) throw classify(error);
}

export async function castPlayerVote(
  riotMatchID: string,
  playerKey: string,
  score: number,
  expectedUID: string
): Promise<void> {
  const { error } = await getSupabase().rpc("cast_player_vote", {
    p_riot_match_id: riotMatchID,
    p_player_key: playerKey,
    p_score: score,
    p_expected_uid: expectedUID,
  });
  if (error) throw classify(error);
}

export async function postComment(options: {
  riotMatchID: string;
  body: string;
  parentID: string | null;
  playerKey: string | null;
  expectedUID: string;
}): Promise<string> {
  const { data, error } = await getSupabase().rpc("post_comment", {
    p_riot_match_id: options.riotMatchID,
    // 明確的 null——undefined 會改變 RPC 的解析簽名
    p_parent_id: options.parentID ?? null,
    p_body: options.body,
    p_player_key: options.playerKey ?? null,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
  return data as string;
}

export async function deleteComment(commentID: string): Promise<void> {
  // RLS「刪自己的留言」；不是自己的列會靜默刪 0 筆
  const { error } = await getSupabase().from("comments").delete().eq("id", commentID);
  if (error) throw classify(error);
}

export async function setCommentLike(
  commentID: string,
  liked: boolean,
  expectedUID: string
): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await getSupabase().rpc("set_comment_like", {
    p_comment_id: commentID,
    p_liked: liked,
    p_expected_uid: expectedUID,
  });
  if (error) throw classify(error);
  const row = Array.isArray(data) ? data[0] : null;
  return {
    liked: Boolean(row?.liked),
    likeCount: (row?.like_count as number | undefined) ?? 0,
  };
}

export async function reportComment(commentID: string, expectedUID: string): Promise<void> {
  const { error } = await getSupabase().rpc("report_comment", {
    p_comment_id: commentID,
    p_expected_uid: expectedUID,
  });
  if (error) throw classify(error);
}

export async function blockUser(targetID: string, expectedUID: string): Promise<void> {
  // 直接 upsert；RLS with check (auth.uid() = user_id) 擋 session 漂移
  const { error } = await getSupabase()
    .from("blocked_users")
    .upsert({ user_id: expectedUID, blocked_id: targetID });
  if (error) throw classify(error);
}

export async function unblockUser(targetID: string, expectedUID: string): Promise<void> {
  // 刻意帶 expectedUID 的條件：半路換帳號時變成無害的刪 0 筆
  const { error } = await getSupabase()
    .from("blocked_users")
    .delete()
    .eq("user_id", expectedUID)
    .eq("blocked_id", targetID);
  if (error) throw classify(error);
}

export async function setProfile(options: {
  displayName: string;
  avatarCardID: string | null;
  expectedUID: string;
}): Promise<void> {
  const { error } = await getSupabase().rpc("set_profile", {
    p_display_name: options.displayName,
    p_avatar_card_id: options.avatarCardID ?? null,
    p_expected_uid: options.expectedUID,
  });
  if (error) throw classify(error);
}

// ---------- Watcher kick ----------

/** 請伺服器重跑一輪 Riot 賽程掃描（60 秒全域冷卻；throttled 不是錯誤） */
export async function requestWindowSync(): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().functions.invoke("esports-watcher");
    if (error) return false;
    const response = data as { ok?: boolean; throttled?: boolean } | null;
    return Boolean(response?.ok) && response?.throttled !== true;
  } catch {
    return false;
  }
}
