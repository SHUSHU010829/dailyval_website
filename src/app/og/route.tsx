import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "DailyVal";
  const description =
    searchParams.get("description") ??
    "Trusted by 900K+ players. Daily shop, match analytics & community.";
  const locale = searchParams.get("locale") ?? "zh-TW";

  const isZhTW = locale === "zh-TW";

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
          fontFamily: "sans-serif",
        }}
      >
        {/* 背景光暈 */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,70,85,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "200px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(94,229,255,0.08) 0%, transparent 70%)",
          }}
        />

        {/* 頂部 label */}
        <div
          style={{
            color: "#ff4655",
            fontSize: "13px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: "24px",
            display: "flex",
          }}
        >
          // VALORANT COMPANION APP //
        </div>

        {/* Logo */}
        <div
          style={{
            color: "#ff4655",
            fontSize: "52px",
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          DailyVal
        </div>

        {/* Title */}
        <div
          style={{
            color: "#ffffff",
            fontSize: "36px",
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: "680px",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "20px",
            lineHeight: 1.5,
            maxWidth: "620px",
            marginBottom: "48px",
            display: "flex",
          }}
        >
          {description}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "48px" }}>
          {[
            { value: "900K+", label: isZhTW ? "活躍玩家" : "Active Players" },
            { value: "4.7★", label: isZhTW ? "App Store 評分" : "App Store Rating" },
            { value: "#1", label: isZhTW ? "亞洲 Valorant App" : "Valorant App in Asia" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "#ff4655", fontSize: "28px", fontWeight: 900 }}>
                {stat.value}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* 右下角裝飾線 */}
        <div
          style={{
            position: "absolute",
            right: "80px",
            bottom: "80px",
            width: "120px",
            height: "1px",
            background: "rgba(255,70,85,0.4)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "80px",
            bottom: "80px",
            width: "1px",
            height: "120px",
            background: "rgba(255,70,85,0.4)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
