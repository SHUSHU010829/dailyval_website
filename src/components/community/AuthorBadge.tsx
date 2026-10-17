"use client";

/* eslint-disable @next/next/no-img-element */
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import { displayName } from "@/lib/community/mapping";
import { rankIconURL } from "@/lib/community/rank";
import { saveScroll } from "@/lib/community/scroll-memory";
import type { SocialAuthor } from "@/lib/community/types";

// 作者署名：頭像、名字#tag、段位圖示、認證／高級徽章。
// 認領前的舊資料沒有帳號 id：名字不可點、也沒有個人頁。

interface AuthorBadgeProps {
  author: SocialAuthor;
  size?: number;
  /** 預設可點進作者頁；作者頁本身不需要再連回自己 */
  linked?: boolean;
}

function Avatar({ author, size }: { author: SocialAuthor; size: number }) {
  const t = useTranslations("communityBoard.a11y");
  if (!author.avatarURL) {
    return (
      <div
        className="cut-sm flex shrink-0 items-center justify-center bg-bg-elevated font-ui text-xs font-bold text-text-2"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {author.name.charAt(0).toUpperCase() || "?"}
      </div>
    );
  }
  return (
    <img
      src={author.avatarURL}
      alt={t("userAvatar", { userName: author.name })}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="cut-sm shrink-0 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export default function AuthorBadge({
  author,
  size = 36,
  linked = true,
}: AuthorBadgeProps) {
  const t = useTranslations("communityBoard.a11y");
  const rankIcon = rankIconURL(author.rankTier);

  const name = (
    <span className="font-ui text-sm font-bold tracking-wide text-text-1">
      {author.name}
      {author.tagLine && (
        <span className="font-normal text-text-3"> #{author.tagLine}</span>
      )}
    </span>
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar author={author} size={size} />
      <div className="flex min-w-0 items-center gap-1.5">
        {linked && author.id ? (
          <Link
            href={`/community/user/${author.id}`}
            // 點進作者頁前記下目前位置，回來時還原
            onClick={() =>
              saveScroll({
                path: window.location.pathname,
                y: window.scrollY,
              })
            }
            className="truncate hover:underline"
            aria-label={displayName(author)}
          >
            {name}
          </Link>
        ) : (
          <span className="truncate">{name}</span>
        )}
        {author.isVerified && (
          <span className="text-jett-blue" title={t("verified")}>
            <Icon name="SealCheck" size={16} aria-label={t("verified")} />
          </span>
        )}
        {author.isPremium && (
          <span className="text-gold" title={t("premium")}>
            <Icon name="Crown" size={16} aria-label={t("premium")} />
          </span>
        )}
        {rankIcon && (
          <img
            src={rankIcon}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            className="size-5 shrink-0 object-contain"
          />
        )}
      </div>
    </div>
  );
}
