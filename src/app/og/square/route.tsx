import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { loadOgFonts, truncate } from "@/lib/og-fonts";

export const runtime = "edge";
export const revalidate = 31536000;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = truncate(
    searchParams.get("title") ?? "遊玩 Valorant 時的最佳夥伴",
    80
  );
  const description = truncate(
    searchParams.get("description") ??
      "加入超過 90 萬玩家的頂尖社群，隨時掌握遊戲動態！",
    140
  );
  const locale = searchParams.get("locale") ?? "zh-TW";
  const isZhTW = locale === "zh-TW";

  const subsetText =
    title +
    " " +
    description +
    " 活躍玩家 App Store 評分 亞洲 Valorant 遊玩 最佳夥伴 加入社群 頂尖";

  const fontEntries = await loadOgFonts({ isZhTW, subsetText });

  const headlineFont = isZhTW
    ? "NotoSansTC, Rajdhani, system-ui"
    : "Orbitron, Rajdhani, system-ui";
  const bodyFont = isZhTW
    ? "NotoSansTC, Rajdhani, system-ui"
    : "Rajdhani, system-ui";

  const stats = [
    { value: "900K+", label: isZhTW ? "活躍玩家" : "ACTIVE PLAYERS" },
    {
      value: "4.7",
      label: isZhTW ? "APP STORE 評分" : "APP STORE RATING",
    },
    {
      value: "#1",
      label: isZhTW ? "亞洲 Valorant App" : "VALORANT APP IN ASIA",
    },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "96px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Layer 1: Circuit grid 背景 */}
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

        {/* Layer 2: 紅色 radial glow（右上） */}
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -220,
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,70,85,0.20) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Layer 3: 藍色 radial glow（左下） */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -200,
            width: 760,
            height: 760,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(94,229,255,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Layer 4a: HUD 括弧 — 左上 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 56,
            width: 40,
            height: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 40,
              height: 2,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 2,
              height: 40,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
        </div>

        {/* Layer 4b: HUD 括弧 — 右上 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 56,
            width: 40,
            height: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 40,
              height: 2,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 2,
              height: 40,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
        </div>

        {/* Layer 4c: HUD 括弧 — 左下 */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 56,
            width: 40,
            height: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 40,
              height: 2,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 2,
              height: 40,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
        </div>

        {/* Layer 4d: HUD 括弧 — 右下 */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 56,
            width: 40,
            height: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 40,
              height: 2,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 2,
              height: 40,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
        </div>

        {/* Layer 6: 右上 SYS/REGION/PING 狀態塊 */}
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 96,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "Rajdhani, system-ui",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "rgba(234,234,240,0.3)" }}>SYS:</span>
            <span style={{ color: "#2DFF73" }}>ONLINE</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "Rajdhani, system-ui",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "rgba(234,234,240,0.3)" }}>REGION:</span>
            <span style={{ color: "#5EE5FF" }}>AP</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "Rajdhani, system-ui",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(234,234,240,0.3)",
            }}
          >
            <span>PING:</span>
            <span>12ms</span>
          </div>
        </div>

        {/* Layer 5: 主要內容欄（1200 - 2×96 = 1008px） */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 1008,
            zIndex: 1,
          }}
        >
          {/* Wordmark — 三層 glitch freeze-frame */}
          <div
            style={{
              position: "relative",
              display: "flex",
              height: 108,
              marginBottom: 36,
            }}
          >
            {/* 後層：jett-blue +3px */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 3,
                display: "flex",
                color: "#5EE5FF",
                fontSize: 96,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.6,
              }}
            >
              DailyVal
            </div>
            {/* 中層：淡紅 -3px */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -3,
                display: "flex",
                color: "#FF7580",
                fontSize: 96,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.4,
              }}
            >
              DailyVal
            </div>
            {/* 前層：正色 + neon glow */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "flex",
                color: "#FF4655",
                fontSize: 96,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textShadow:
                  "0 0 18px rgba(255,70,85,0.5), 0 0 44px rgba(255,70,85,0.3)",
              }}
            >
              DailyVal
            </div>
          </div>

          {/* Title */}
          <span
            style={{
              color: "#EAEAF0",
              fontSize: 52,
              fontFamily: headlineFont,
              fontWeight: 700,
              lineHeight: 1.25,
              maxWidth: 900,
              marginBottom: 24,
            }}
          >
            {title}
          </span>

          {/* Description */}
          <span
            style={{
              color: "rgba(234,234,240,0.55)",
              fontSize: 26,
              fontFamily: bodyFont,
              fontWeight: isZhTW ? 400 : 600,
              lineHeight: 1.5,
              maxWidth: 820,
              marginBottom: 44,
            }}
          >
            {description}
          </span>

          {/* Diamond divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: 820,
              gap: 14,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: "rgba(234,234,240,0.3)",
                display: "flex",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                background: "#FF4655",
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                display: "flex",
              }}
            />
            <div
              style={{
                flex: 1,
                height: 1,
                background: "rgba(234,234,240,0.3)",
                display: "flex",
              }}
            />
          </div>

          {/* 統計面板 */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignSelf: "flex-start",
              padding: "24px 44px",
              background: "#0e0e16",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginRight: i < stats.length - 1 ? 56 : 0,
                }}
              >
                <span
                  style={{
                    color: "#FF4655",
                    fontSize: 36,
                    fontFamily: "Orbitron, system-ui",
                    fontWeight: 900,
                    letterSpacing: "0.02em",
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    color: "rgba(234,234,240,0.3)",
                    fontSize: 13,
                    fontFamily: "Rajdhani, system-ui",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Layer 7: CRT 掃描線覆蓋（最頂層） */}
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
      height: 1200,
      fonts: fontEntries,
    }
  );
}
