import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const revalidate = 31536000;

// 字型 TTF URL（從 fonts.googleapis.com/css 解析，gstatic vN 穩定）
const ORBITRON_700 =
  "https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1ny_CmBoWg2.ttf";
const ORBITRON_900 =
  "https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nysimBoWg2.ttf";
const RAJDHANI_600 =
  "https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pbYF_OreeI.ttf";
const RAJDHANI_700 =
  "https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pa8FvOreeI.ttf";

function fetchWithTimeout(url: string, options: RequestInit, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(tid)
  );
}

async function loadTTF(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetchWithTimeout(url, { cache: "force-cache" });
    if (!r.ok) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadNotoTC(
  text: string,
  weight: 400 | 700
): Promise<ArrayBuffer | null> {
  try {
    // CSS1 endpoint 固定回傳 TTF，透過 text= 子集化縮小 payload
    const css = await fetchWithTimeout(
      `https://fonts.googleapis.com/css?family=Noto+Sans+TC:${weight}&text=${encodeURIComponent(text)}`,
      { cache: "force-cache" }
    ).then((r) => r.text());
    const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!m) return null;
    return await fetchWithTimeout(m[1], { cache: "force-cache" }).then((r) =>
      r.arrayBuffer()
    );
  } catch {
    return null;
  }
}

function truncate(s: string, n: number): string {
  if (!s) return s;
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

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

  // Noto Sans TC text= 子集：UI 固定文字 + 使用者傳入內容
  const subsetText =
    title +
    " " +
    description +
    " 活躍玩家 App Store 評分 亞洲 Valorant 遊玩 最佳夥伴 加入社群 頂尖";

  const [orbitron700, orbitron900, rajdhani600, rajdhani700, notoTC400, notoTC700] =
    await Promise.all([
      loadTTF(ORBITRON_700),
      loadTTF(ORBITRON_900),
      loadTTF(RAJDHANI_600),
      loadTTF(RAJDHANI_700),
      isZhTW ? loadNotoTC(subsetText, 400) : Promise.resolve(null),
      isZhTW ? loadNotoTC(subsetText, 700) : Promise.resolve(null),
    ]);

  const fontEntries = [
    orbitron700 && {
      name: "Orbitron",
      data: orbitron700,
      weight: 700 as const,
      style: "normal" as const,
    },
    orbitron900 && {
      name: "Orbitron",
      data: orbitron900,
      weight: 900 as const,
      style: "normal" as const,
    },
    rajdhani600 && {
      name: "Rajdhani",
      data: rajdhani600,
      weight: 600 as const,
      style: "normal" as const,
    },
    rajdhani700 && {
      name: "Rajdhani",
      data: rajdhani700,
      weight: 700 as const,
      style: "normal" as const,
    },
    notoTC400 && {
      name: "NotoSansTC",
      data: notoTC400,
      weight: 400 as const,
      style: "normal" as const,
    },
    notoTC700 && {
      name: "NotoSansTC",
      data: notoTC700,
      weight: 700 as const,
      style: "normal" as const,
    },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style: "normal" | "italic";
  }[];

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
          height: "630px",
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
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
            top: -160,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,70,85,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Layer 3: 藍色 radial glow（左下） */}
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(94,229,255,0.10) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Layer 4a: HUD 括弧 — 左上 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 56,
            width: 32,
            height: 32,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 32,
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
              height: 32,
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
            width: 32,
            height: 32,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 32,
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
              height: 32,
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
            width: 32,
            height: 32,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 32,
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
              height: 32,
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
            width: 32,
            height: 32,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 32,
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
              height: 32,
              background: "rgba(255,70,85,0.6)",
              display: "flex",
            }}
          />
        </div>

        {/* Layer 6: 右上 SYS/REGION/PING 狀態塊 */}
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 80,
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
              fontSize: 13,
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
              fontSize: 13,
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
              fontSize: 13,
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

        {/* Layer 5: 主要內容欄（1200 - 2×80 = 1040px） */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 1040,
            zIndex: 1,
          }}
        >
          {/* HUD label */}
          <span
            style={{
              color: "#FF4655",
              fontSize: 14,
              fontFamily: "Rajdhani, system-ui",
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            // DAILYVAL //
          </span>

          {/* Wordmark — 三層 glitch freeze-frame */}
          <div
            style={{
              position: "relative",
              display: "flex",
              height: 72,
              marginBottom: 24,
            }}
          >
            {/* 後層：jett-blue +2px，最低 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 2,
                display: "flex",
                color: "#5EE5FF",
                fontSize: 64,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.6,
              }}
            >
              DailyVal
            </div>
            {/* 中層：淡紅 -2px */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -2,
                display: "flex",
                color: "#FF7580",
                fontSize: 64,
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
                fontSize: 64,
                fontFamily: "Orbitron, system-ui",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textShadow:
                  "0 0 14px rgba(255,70,85,0.5), 0 0 36px rgba(255,70,85,0.3)",
              }}
            >
              DailyVal
            </div>
          </div>

          {/* Title */}
          <span
            style={{
              color: "#EAEAF0",
              fontSize: 42,
              fontFamily: headlineFont,
              fontWeight: 700,
              lineHeight: 1.25,
              maxWidth: 720,
              marginBottom: 18,
            }}
          >
            {title}
          </span>

          {/* Description */}
          <span
            style={{
              color: "rgba(234,234,240,0.55)",
              fontSize: 22,
              fontFamily: bodyFont,
              fontWeight: isZhTW ? 400 : 600,
              lineHeight: 1.5,
              maxWidth: 640,
              marginBottom: 32,
            }}
          >
            {description}
          </span>

          {/* Diamond divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: 640,
              gap: 12,
              marginBottom: 28,
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
                width: 8,
                height: 8,
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

          {/* 統計面板：alignSelf flex-start 防止 stretch 到 1040px */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignSelf: "flex-start",
              padding: "20px 36px",
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
                  marginRight: i < stats.length - 1 ? 48 : 0,
                }}
              >
                <span
                  style={{
                    color: "#FF4655",
                    fontSize: 30,
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
                    fontSize: 12,
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
      height: 630,
      fonts: fontEntries,
    }
  );
}
