import { getTranslations } from "next-intl/server";
import Icon from "@/components/Icon";

const COMMUNITY_URL = "https://social.dailyval.com";

const PREVIEW_POSTS = [
  {
    initials: "SC",
    avatarColor: "#ff4655",
    username: "商城控_TW",
    tag: "#8821",
    content: "今天商城出蓋亞暴徒了！！DailyVal 一通知馬上截圖來炫耀，這把等好久了，直接買爆 🔥",
    likes: 248,
    comments: 31,
    postTag: "商城",
    postTagColor: "#ff4655",
  },
  {
    initials: "CM",
    avatarColor: "#5ee5ff",
    username: "Chamber_Main",
    tag: "#0087",
    content: "剛看 DailyVal 戰績，我用錢伯爾獵頭的爆頭率 47%⋯⋯ 好啦這輩子只玩錢伯爾了，不接受反駁 😂",
    likes: 184,
    comments: 57,
    postTag: "戰績",
    postTagColor: "#5ee5ff",
  },
  {
    initials: "TP",
    avatarColor: "#2dff73",
    username: "TaiwanPeak",
    tag: "#1337",
    content: "透過每日配對功能找到固定隊！從黃金一路打到白金，謝謝社群裡認識的夥伴們 🙌",
    likes: 412,
    comments: 88,
    postTag: "組隊",
    postTagColor: "#2dff73",
  },
];

export default async function CommunitySection() {
  const t = await getTranslations("community");

  return (
    <section
      id="community"
      aria-labelledby="community-heading"
      className="relative overflow-hidden px-6 py-24 md:px-12"
    >
      {/* 背景裝飾 */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-jett-blue/5 via-transparent to-val-red/5" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* 標題區 */}
        <div className="mb-12 text-center">
          <p className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-jett-blue" aria-hidden="true">
            // COMMUNITY //
          </p>
          <h2
            id="community-heading"
            className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-2">
            {t("description")}
          </p>
        </div>

        {/* 精選貼文預覽卡片 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PREVIEW_POSTS.map((post) => (
            <a
              key={post.username}
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cut group flex flex-col gap-4 border border-border-med bg-bg-panel p-5 transition-all duration-200 hover:border-jett-blue/40 hover:bg-bg-panel-hover"
            >
              {/* 用戶資訊 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 頭像：漸層光暈幾何風格 */}
                  <div
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center font-display text-xs font-black tracking-wider text-white"
                    style={{
                      background: `linear-gradient(135deg, ${post.avatarColor}33 0%, ${post.avatarColor}11 100%)`,
                      border: `1px solid ${post.avatarColor}55`,
                      boxShadow: `0 0 10px ${post.avatarColor}22, inset 0 1px 0 ${post.avatarColor}33`,
                      clipPath: "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)",
                    }}
                  >
                    <span style={{ color: post.avatarColor }}>{post.initials}</span>
                  </div>
                  <div>
                    <p className="font-ui text-sm font-bold tracking-wide text-text-1">
                      {post.username}
                      <span className="ml-0.5 font-normal text-text-3">{post.tag}</span>
                    </p>
                  </div>
                </div>
                {/* 貼文標籤 */}
                <span
                  className="cut px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: post.postTagColor + "22", color: post.postTagColor }}
                >
                  {post.postTag}
                </span>
              </div>

              {/* 貼文內容 */}
              <p className="line-clamp-3 text-sm leading-relaxed text-text-2">
                {post.content}
              </p>

              {/* 互動數 */}
              <div className="mt-auto flex items-center gap-4 border-t border-border-dim pt-3">
                <span className="flex items-center gap-1.5 font-ui text-xs text-text-3">
                  <Icon name="Heart" size={13} weight="bold" aria-hidden="true" />
                  {post.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 font-ui text-xs text-text-3">
                  <Icon name="ChatCircle" size={13} weight="bold" aria-hidden="true" />
                  {post.comments}
                </span>
                <span className="ml-auto font-ui text-[10px] uppercase tracking-widest text-jett-blue opacity-0 transition-opacity group-hover:opacity-100">
                  查看更多 →
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* 主 CTA */}
        <div className="mt-10 text-center">
          <a
            href={t("joinUrl")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("joinLabel")}
            className="cut inline-flex items-center gap-3 border border-jett-blue/60 bg-jett-blue/10 px-8 py-4 font-ui text-sm uppercase tracking-widest text-jett-blue transition-all hover:bg-jett-blue/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue"
          >
            <Icon name="ArrowSquareOut" size={18} weight="bold" aria-hidden="true" />
            {t("joinLabel")}
          </a>
        </div>
      </div>
    </section>
  );
}
