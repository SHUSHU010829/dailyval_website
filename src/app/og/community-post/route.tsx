import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { isUUID } from "@/lib/community/mapping";
import { ogImageFor } from "@/lib/community/og";
import { fetchPostDetail } from "@/lib/community/reads";
import { loadOgFonts, truncate } from "@/lib/og-fonts";

// 社群貼文專屬 OG 圖：分享到 Discord / Threads / Twitter 時的預覽卡。
// 只吃 id + locale，貼文自己抓——不像 /og 接受任意 title 文字，這張卡上的每個字
// 都來自我們的資料源，外部無法注入內容。id 不是 uuid 時完全不打資料庫；
// 貼文抓不到就退化成純品牌卡，永遠回得出圖。

export const runtime = "edge";
// 計數與內文可能被審核下架；與貼文頁的 ISR 節奏一致
export const revalidate = 300;

const BODY_LIMIT = 140;
const NAME_LIMIT = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id") ?? "";
  const locale = searchParams.get("locale") ?? "zh-TW";
  const isZhTW = locale === "zh-TW";

  const post = isUUID(id) ? await fetchPostDetail(id) : null;

  const kicker = isZhTW ? "玩家社群" : "PLAYER COMMUNITY";
  const tagline = isZhTW
    ? "分享對局、造型與心得，上 DailyVal 一起聊。"
    : "Share matches, skins and thoughts on DailyVal.";
  const authorName = post ? truncate(post.author.name, NAME_LIMIT) : null;
  const body = post
    ? truncate(post.body.replace(/\s+/g, " ").trim(), BODY_LIMIT)
    : "";
  const image = post ? ogImageFor(post) : null;

  // Noto Sans TC text= 子集：涵蓋這張卡會渲染的所有中文字串
  const subsetText =
    kicker + tagline + (authorName ?? "") + body + "0123456789 #";
  const fontEntries = await loadOgFonts({ isZhTW, subsetText });
  const headlineFont = isZhTW
    ? "NotoSansTC, Rajdhani, system-ui"
    : "Rajdhani, system-ui";

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 紅色 radial glow（右上） */}
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -160,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,70,85,0.16) 0%, transparent 65%)",
          display: "flex",
        }}
      />

      {/* Header：品牌 wordmark ＋ kicker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: "#FF4655",
            fontSize: 40,
            fontFamily: "Orbitron, system-ui",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          DailyVal
        </span>
        <span
          style={{
            color: "rgba(234,234,240,0.55)",
            fontSize: 20,
            fontFamily: headlineFont,
            fontWeight: 700,
            letterSpacing: isZhTW ? "0.3em" : "0.15em",
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </span>
      </div>

      {/* 內容：作者＋內文（＋第一張圖）；貼文抓不到時放大 tagline 當主角 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          zIndex: 1,
        }}
      >
        {post ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              flex: 1,
            }}
          >
            <span
              style={{
                color: "#30b0c7",
                fontSize: 34,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {authorName}
            </span>
            <span
              style={{
                color: "#EAEAF0",
                fontSize: image ? 38 : 46,
                lineHeight: 1.35,
                fontFamily: headlineFont,
                fontWeight: 700,
              }}
            >
              {body}
            </span>
          </div>
        ) : (
          <span
            style={{
              color: "#EAEAF0",
              fontSize: 52,
              fontFamily: headlineFont,
              fontWeight: 700,
              maxWidth: 960,
            }}
          >
            {tagline}
          </span>
        )}
        {image && (
          <img
            src={image}
            alt=""
            width={340}
            height={340}
            style={{
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        )}
      </div>

      {/* Footer */}
      <span
        style={{
          color: "rgba(234,234,240,0.45)",
          fontSize: 22,
          fontFamily: headlineFont,
          fontWeight: isZhTW ? 400 : 600,
          letterSpacing: "0.08em",
          zIndex: 1,
          opacity: post ? 1 : 0,
        }}
      >
        {tagline}
      </span>
    </div>,
    { width: 1200, height: 630, fonts: fontEntries },
  );
}
