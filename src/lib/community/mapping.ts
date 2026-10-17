// 伺服器原始列 → 畫面模型。全部在這裡轉一次，元件不看 snake_case。

import {
  MEDIA_BASE_URL,
  playerCardSmallArtURL,
} from "@/lib/community/constants";
import type {
  AuthorProfile,
  AuthorProfileRow,
  CommentRow,
  FeedCursor,
  ImageRow,
  PostRow,
  ReactionKind,
  SocialAuthor,
  SocialComment,
  SocialImage,
  SocialPost,
} from "@/lib/community/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * 伺服器把頭像當一個 text 欄位送：已認領的作者是 playercard uuid，
 * 舊資料是 CloudKit 時代存的網址字串（通常是 .../playercards/{id}/smallart.png，
 * 偶爾少了檔名）。兩種都轉成可以直接放進 <img> 的 smallart 網址。
 */
export function avatarURL(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (isUUID(raw)) return playerCardSmallArtURL(raw);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("playercards");
  if (index !== -1 && isUUID(parts[index + 1])) {
    return playerCardSmallArtURL(parts[index + 1]);
  }
  return raw;
}

/** R2 物件 key → 公開網址。key 的每一段都做 encode，避免特殊字元破壞路徑。 */
export function mediaURL(key: string): string {
  return `${MEDIA_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * 從 CloudKit 搬過來的圖只有 400px 的縮圖，而內容多半是計分板截圖，
 * 列表載入縮圖會糊到看不清字；新上傳的縮圖是 1080px，列表用縮圖就夠。
 * 兩種 key 不會撞：搬移寫的是 `<position>-import.<ext>`，新上傳是純 hex。
 */
export function isMigratedKey(key: string): boolean {
  return key.includes("-import");
}

export function imageFromRow(row: ImageRow): SocialImage {
  const url = mediaURL(row.key);
  const thumbURL = mediaURL(row.thumb);
  return {
    position: row.position,
    key: row.key,
    thumbKey: row.thumb,
    width: row.width ?? null,
    height: row.height ?? null,
    url,
    thumbURL,
    listURL: isMigratedKey(row.key) ? url : thumbURL,
  };
}

function reaction(raw: string | null | undefined): ReactionKind | null {
  return raw === "like" || raw === "dislike" ? raw : null;
}

function author(row: {
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  author_tag_line: string | null;
  author_rank_tier: number | null;
  author_is_verified: boolean | null;
  author_is_premium: boolean | null;
}): SocialAuthor {
  return {
    id: row.author_id,
    // 舊資料可能整個少了作者快照；空的署名總比整篇從動態牆消失好
    name: row.author_name ?? "",
    tagLine: row.author_tag_line || null,
    rankTier: row.author_rank_tier ?? null,
    isVerified: row.author_is_verified ?? false,
    isPremium: row.author_is_premium ?? false,
    avatarURL: avatarURL(row.author_avatar),
  };
}

export function postFromRow(row: PostRow): SocialPost {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    likeCount: row.like_count,
    dislikeCount: row.dislike_count,
    commentCount: row.comment_count,
    author: author(row),
    images: (row.images ?? [])
      .map(imageFromRow)
      .sort((a, b) => a.position - b.position),
    myReaction: reaction(row.my_reaction),
    didReport: row.my_report ?? false,
  };
}

export function commentFromRow(row: CommentRow): SocialComment {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    createdAt: row.created_at,
    likeCount: row.like_count,
    author: author(row),
    imageURL: row.image_key ? mediaURL(row.image_key) : null,
    thumbURL: row.thumb_key ? mediaURL(row.thumb_key) : null,
    myReaction: reaction(row.my_reaction),
    didReport: row.my_report ?? false,
  };
}

export function profileFromRow(row: AuthorProfileRow): AuthorProfile {
  return {
    id: row.id,
    displayName: row.display_name || null,
    tagLine: row.tag_line || null,
    rankTier: row.rank_tier ?? null,
    isVerified: row.is_verified ?? false,
    isPremium: row.is_premium ?? false,
    avatarURL: avatarURL(row.avatar),
  };
}

/** 下一頁的游標：這一頁最後一列 */
export function cursorOf(item: { createdAt: string; id: string }): FeedCursor {
  return { createdAt: item.createdAt, id: item.id };
}

/** "Name#TAG"，tag 沒有跟著搬過來就只顯示名字 */
export function displayName(author: {
  name: string;
  tagLine: string | null;
}): string {
  return author.tagLine ? `${author.name}#${author.tagLine}` : author.name;
}
