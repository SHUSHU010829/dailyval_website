import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createTranslator } from "next-intl";
import { loadOgFonts, truncate } from "@/lib/og-fonts";
import { fetchSharedRoom, roomQueueKey, roomState } from "@/lib/teamup/room";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh-TW.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh-TW";
  const t = createTranslator({ locale, messages: locale === "en" ? en : zh, namespace: "room" });
  const result = await fetchSharedRoom(request.nextUrl.searchParams.get("id") ?? "");
  const room = result.kind === "room" ? result.room : null;
  const title = truncate(room?.title ?? t(result.kind === "error" ? "errorTitle" : "unavailableTitle"), 60);
  const status = room ? t(`states.${roomState(room)}`) : t("title");
  const details = room ? t("preview", {
    server: t(`servers.${room.shard}`), queue: t(`queues.${roomQueueKey(room.queue)}`),
    count: room.memberCount, status,
  }) : t(result.kind === "error" ? "errorDescription" : "unavailableDescription");
  // 英文頁也可能分享中文房名；字型子集由內容決定，不只看網站語系。
  const fonts = await loadOgFonts({ isZhTW: locale === "zh-TW" || /[^\x00-\x7f]/.test(title), subsetText: `${title} ${status} ${details} DailyVal TEAM UP` });
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 72, background: "#0a0a0f", color: "#fafafa", fontFamily: "NotoSansTC, Rajdhani", borderTop: "12px solid #ff4655" }}>
      <div style={{ display: "flex", color: "#ff4655", fontSize: 28, letterSpacing: 4 }}>DAILYVAL / TEAM UP</div>
      <div style={{ display: "flex", marginTop: 40, color: "#5ee5ff", fontSize: 30 }}>{status}</div>
      <div style={{ display: "flex", marginTop: 18, fontSize: 56, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 27, color: "#b2b2c3" }}>{details}</div>
    </div>,
    { width: 1200, height: 630, fonts, headers: { "Cache-Control": "no-store" } },
  );
}
