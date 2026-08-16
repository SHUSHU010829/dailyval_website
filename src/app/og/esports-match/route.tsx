import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { loadOgFonts } from "@/lib/og-fonts";
import { fetchEsportsMatch, fetchMatchRating } from "@/lib/esports";

// 電競比賽專屬 OG 圖：分享到 Discord / Threads / Twitter 時的預覽卡。
// 只吃 id + locale，比賽資料自己抓——不像 /og 接受任意 title 文字，
// 這張卡上的每個字都來自我們的資料源，外部無法注入內容。
// 任一資料源失敗就退化成純品牌卡，永遠回得出圖。

export const runtime = "edge";
// 比分與評分會變動；與 landing page 的資料快取節奏一致
export const revalidate = 300;

/** 與 landing page 相同的守門：Riot match id 是純數字 */
function isValidMatchID(id: string): boolean {
  return /^\d{1,25}$/.test(id);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id") ?? "";
  const locale = searchParams.get("locale") ?? "zh-TW";
  const isZhTW = locale === "zh-TW";

  const [match, rating] = isValidMatchID(id)
    ? await Promise.all([fetchEsportsMatch(id, locale), fetchMatchRating(id)])
    : [null, null];

  const kicker = isZhTW ? "電競賽後評分" : "ESPORTS MATCH RATINGS";
  const tagline = isZhTW
    ? "不吹不黑，上 DailyVal 貢獻你的評分。"
    : "No hype, no hate. Cast your rating on DailyVal.";
  const ratingCaption =
    rating && rating.avg !== null
      ? isZhTW
        ? `${rating.voteCount} 人評分 · ${rating.commentCount} 則留言`
        : `${rating.voteCount} RATING${rating.voteCount === 1 ? "" : "S"} · ${
            rating.commentCount
          } COMMENT${rating.commentCount === 1 ? "" : "S"}`
      : null;
  const leagueLine = match
    ? `${match.leagueName}${match.bestOf ? ` · Bo${match.bestOf}` : ""}`
    : null;
  const score = match
    ? match.started
      ? `${match.teams[0].gameWins} : ${match.teams[1].gameWins}`
      : "VS"
    : null;

  // Noto Sans TC text= 子集：涵蓋這張卡會渲染的所有中文字串
  // （聯賽名稱已在地化、評分行、kicker、tagline）＋數字與分隔符
  const subsetText =
    kicker + tagline + (leagueLine ?? "") + (ratingCaption ?? "") + "0123456789 ·：";

  const fontEntries = await loadOgFonts({ isZhTW, subsetText });

  const headlineFont = isZhTW
    ? "NotoSansTC, Rajdhani, system-ui"
    : "Rajdhani, system-ui";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Circuit grid 背景（與 /og 同款） */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(94,229,255,0.04) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(94,229,255,0.04) 1px, transparent 1px), " +
              "linear-gradient(rgba(94,229,255,0.02) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(94,229,255,0.02) 1px, transparent 1px)",
            backgroundSize: "64px 64px, 64px 64px, 16px 16px, 16px 16px",
            display: "flex",
          }}
        />

        {/* 紅色 radial glow（右上）＋藍色 radial glow（左下） */}
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
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(48,176,199,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Header：品牌 wordmark ＋ kicker */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
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
              textShadow:
                "0 0 14px rgba(255,70,85,0.5), 0 0 36px rgba(255,70,85,0.3)",
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

        {/* Matchup：聯賽行 ＋ 隊伍對決 ＋ 評分行 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            zIndex: 1,
          }}
        >
          {leagueLine && (
            <span
              style={{
                color: "rgba(234,234,240,0.45)",
                fontSize: 22,
                fontFamily: headlineFont,
                fontWeight: isZhTW ? 400 : 600,
                letterSpacing: "0.1em",
              }}
            >
              {leagueLine}
            </span>
          )}

          {match && score ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 56,
              }}
            >
              <TeamBlock
                image={match.teams[0].image}
                code={match.teams[0].code}
              />
              <span
                style={{
                  color: "#EAEAF0",
                  fontSize: 88,
                  fontFamily: "Orbitron, system-ui",
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                }}
              >
                {score}
              </span>
              <TeamBlock
                image={match.teams[1].image}
                code={match.teams[1].code}
              />
            </div>
          ) : (
            // 比賽抓不到時的退化：不留一個空洞，放大 tagline 當主角
            <span
              style={{
                color: "#EAEAF0",
                fontSize: 44,
                fontFamily: headlineFont,
                fontWeight: 700,
                textAlign: "center",
                maxWidth: 900,
              }}
            >
              {tagline}
            </span>
          )}

          {ratingCaption && rating && rating.avg !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 20,
                padding: "14px 40px",
                background: "rgba(48,176,199,0.10)",
                border: "1px solid rgba(48,176,199,0.35)",
                borderRadius: 16,
              }}
            >
              <span
                style={{
                  color: "#30b0c7",
                  fontSize: 56,
                  fontFamily: "Orbitron, system-ui",
                  fontWeight: 900,
                }}
              >
                {rating.avg.toFixed(1)}
              </span>
              <span
                style={{
                  color: "rgba(234,234,240,0.6)",
                  fontSize: 20,
                  fontFamily: headlineFont,
                  fontWeight: isZhTW ? 400 : 600,
                  letterSpacing: "0.1em",
                }}
              >
                {ratingCaption}
              </span>
            </div>
          )}
        </div>

        {/* Footer：房規 tagline（matchup 正常時） */}
        <span
          style={{
            color: "rgba(234,234,240,0.45)",
            fontSize: 22,
            fontFamily: headlineFont,
            fontWeight: isZhTW ? 400 : 600,
            letterSpacing: "0.08em",
            zIndex: 1,
            opacity: match ? 1 : 0,
          }}
        >
          {tagline}
        </span>

        {/* CRT 掃描線覆蓋（最頂層） */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontEntries,
    }
  );
}

/** 隊徽＋隊伍代號。隊徽是 Riot CDN 的外部圖，Satori 會在渲染時抓取 */
function TeamBlock({ image, code }: { image: string | null; code: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: 200,
      }}
    >
      {image ? (
        <img
          src={image}
          width={120}
          height={120}
          style={{ objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 20,
            background: "#0e0e16",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
          }}
        />
      )}
      <span
        style={{
          color: "#EAEAF0",
          fontSize: 34,
          fontFamily: "Orbitron, system-ui",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        {code}
      </span>
    </div>
  );
}
