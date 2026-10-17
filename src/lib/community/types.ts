// 社群板的畫面用資料模型，以及 Supabase RPC 回傳列的原始形狀。
// 原始列（*Row）只在 mapping.ts 裡轉一次；元件只認上面這一組。

export type ReactionKind = "like" | "dislike";
export type TargetKind = "post" | "comment";

export interface SocialAuthor {
  /** 認領前的舊資料沒有帳號 id；為 null 時名字不可點、也沒有個人頁 */
  id: string | null;
  name: string;
  tagLine: string | null;
  rankTier: number | null;
  isVerified: boolean;
  isPremium: boolean;
  /** 已經解析成可以直接放進 <img> 的網址；沒有頭像時為 null */
  avatarURL: string | null;
}

export interface SocialImage {
  position: number;
  key: string;
  thumbKey: string;
  width: number | null;
  height: number | null;
  /** 原圖（詳細頁、燈箱） */
  url: string;
  /** 縮圖 */
  thumbURL: string;
  /** 列表該載入的那一張：新上傳走縮圖，搬移過來的舊圖走原圖（見 mapping.ts） */
  listURL: string;
}

export interface SocialPost {
  id: string;
  body: string;
  /** PostgREST 回傳的原始 ISO 字串，翻頁游標要原樣送回去 */
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  author: SocialAuthor;
  images: SocialImage[];
  myReaction: ReactionKind | null;
  didReport: boolean;
}

export interface SocialComment {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  likeCount: number;
  author: SocialAuthor;
  imageURL: string | null;
  thumbURL: string | null;
  myReaction: ReactionKind | null;
  didReport: boolean;
}

export interface AuthorProfile {
  id: string;
  displayName: string | null;
  tagLine: string | null;
  rankTier: number | null;
  isVerified: boolean;
  isPremium: boolean;
  avatarURL: string | null;
}

/** keyset 游標：(created_at, id) 一起送，單看時間會在同一毫秒的兩篇之間跳過或重複 */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface PostReactionState {
  likeCount: number;
  dislikeCount: number;
  mine: ReactionKind | null;
}

export interface CommentReactionState {
  likeCount: number;
  mine: ReactionKind | null;
}

// ---------- 伺服器原始列 ----------

export interface ImageRow {
  position: number;
  key: string;
  thumb: string;
  width: number | null;
  height: number | null;
}

export interface PostRow {
  id: string;
  body: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  report_count: number;
  author_id: string | null;
  is_legacy: boolean;
  author_name: string | null;
  author_avatar: string | null;
  author_tag_line: string | null;
  author_rank_tier: number | null;
  author_is_verified: boolean | null;
  author_is_premium: boolean | null;
  images: ImageRow[] | null;
  my_reaction: string | null;
  my_report: boolean | null;
}

export interface CommentRow {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  like_count: number;
  author_id: string | null;
  is_legacy: boolean;
  author_name: string | null;
  author_avatar: string | null;
  author_tag_line: string | null;
  author_rank_tier: number | null;
  author_is_verified: boolean | null;
  author_is_premium: boolean | null;
  image_key: string | null;
  thumb_key: string | null;
  my_reaction: string | null;
  my_report: boolean | null;
}

export interface AuthorProfileRow {
  id: string;
  display_name: string | null;
  avatar: string | null;
  tag_line: string | null;
  rank_tier: number | null;
  is_verified: boolean | null;
  is_premium: boolean | null;
}

export interface PostReactionRow {
  like_count: number;
  dislike_count: number;
  my_kind: string | null;
}

export interface CommentReactionRow {
  like_count: number;
  my_kind: string | null;
}
