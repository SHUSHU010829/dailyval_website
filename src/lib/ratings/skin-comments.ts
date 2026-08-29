// 造型留言的資料形狀與組裝（Supabase skins.comments_public × 讚數）。
// live 列 join esports.profiles 的即時身分；legacy 列（CloudKit 匯入）
// 顯示凍結的快照欄位。likedByMe 是個人化狀態，由呼叫端以自己的
// session 另行取得，永遠不進這個共用形狀。

export const SKIN_COMMENTS_LIMIT = 100;

/** skins.comments_public 的原始列（snake_case 為 PostgREST 契約） */
export interface SkinCommentRow {
  id: string;
  skin_id: string;
  body: string;
  created_at: string;
  user_id: string | null;
  is_legacy: boolean;
  author_name: string | null;
  author_card_id: string | null;
  legacy_tag_line: string | null;
  legacy_user_image: string | null;
  legacy_rank_tier: number | null;
  legacy_is_verify: boolean | null;
}

export interface SkinCommentData {
  id: string;
  skinID: string;
  text: string;
  /** epoch ms（formatRelativeTime 吃 ms） */
  createdAt: number;
  likeCount: number;
  /** live 留言的作者 uid；legacy 匯入為 null（永遠不會是「自己的」） */
  authorUID: string | null;
  isLegacy: boolean;
  /** 空字串＝匿名（UI 顯示在地化的 fallback 名稱） */
  userName: string;
  tagLine: string;
  userImage: string;
  rankTier: number;
  isVerify: boolean;
}

/** 一列 view 資料＋讚數 → 顯示模型（與 iOS displayComment 同款） */
export function displayComment(row: SkinCommentRow, likeCount: number): SkinCommentData {
  const userImage = row.is_legacy
    ? row.legacy_user_image ?? ""
    : row.author_card_id
      ? `https://media.valorant-api.com/playercards/${row.author_card_id.toLowerCase()}/smallart.png`
      : "";
  return {
    id: row.id,
    skinID: row.skin_id,
    text: row.body,
    createdAt: Date.parse(row.created_at),
    likeCount,
    authorUID: row.user_id,
    isLegacy: row.is_legacy,
    userName: row.author_name ?? "",
    tagLine: row.is_legacy ? row.legacy_tag_line ?? "" : "",
    userImage,
    rankTier: row.is_legacy ? row.legacy_rank_tier ?? 0 : 0,
    isVerify: row.is_legacy ? row.legacy_is_verify ?? false : false,
  };
}

/** rows × 讚數表 → 顯示模型陣列 */
export function assembleComments(
  rows: SkinCommentRow[],
  likeCounts: Map<string, number>
): SkinCommentData[] {
  return rows.map((row) => displayComment(row, likeCounts.get(row.id) ?? 0));
}
