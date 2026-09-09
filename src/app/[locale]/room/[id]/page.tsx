import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { APP_STORE_URL } from "@/lib/site-config";
import { fetchSharedRoom, ROOM_SHARE_ORIGIN, roomAppURL, roomQueueKey, roomState } from "@/lib/teamup/room";

export const dynamic = "force-dynamic";
// React cache 只合併同一次 render 的 metadata/page 讀取，不跨請求保存房間。
const readRoom = cache(fetchSharedRoom);
type Params = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, id } = await params;
  const [t, result] = await Promise.all([getTranslations({ locale, namespace: "room" }), readRoom(id)]);
  const room = result.kind === "room" ? result.room : null;
  const description = room ? t("preview", {
    server: t(`servers.${room.shard}`), queue: t(`queues.${roomQueueKey(room.queue)}`),
    count: room.memberCount, status: t(`states.${roomState(room)}`),
  }) : t(result.kind === "error" ? "errorDescription" : "unavailableDescription");
  const metadata = buildMetadata({
    locale, title: room ? `${room.title} | DailyVal` : `${t("title")} | DailyVal`,
    description, path: `/room/${id.toLowerCase()}`,
    baseURL: ROOM_SHARE_ORIGIN,
    ogImage: `/og/room?${new URLSearchParams({ id: id.toLowerCase(), locale })}`,
  });
  const appURL = roomAppURL(id);
  return {
    ...metadata,
    robots: { index: false, follow: false },
    ...(appURL ? { itunes: { appId: "1637782901", appArgument: appURL } } : {}),
  };
}

const actionClass = "inline-flex min-h-12 items-center justify-center px-6 py-3 text-center font-ui text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue";

export default async function RoomPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, result] = await Promise.all([getTranslations("room"), readRoom(id)]);
  const room = result.kind === "room" ? result.room : null;
  const state = room ? roomState(room) : null;
  const appURL = roomAppURL(id);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-20">
      <p className="mb-4 font-ui text-sm font-bold uppercase tracking-[0.2em] text-val-red">DailyVal / {t("title")}</p>
      <section aria-labelledby="room-title" className="border border-border-med bg-bg-panel p-6 md:p-10">
        {room && state ? <>
          <p className={`mb-5 inline-flex border px-3 py-1 font-ui text-sm font-bold ${state === "open" ? "border-jett-blue text-jett-blue" : "border-border-med text-text-2"}`}>
            {t(`states.${state}`)}
          </p>
          <h1 id="room-title" className="break-words text-3xl font-bold leading-snug text-text-1 md:text-4xl">{room.title}</h1>
          <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-border-med py-6 sm:grid-cols-3">
            {[[t("server"), t(`servers.${room.shard}`)], [t("queue"), t(`queues.${roomQueueKey(room.queue)}`)], [t("players"), t("playerCount", { count: room.memberCount })]].map(([label, value], index) => (
              <div key={label} className={index === 0 ? "col-span-2 sm:col-span-1" : undefined}>
                <dt className="font-ui text-sm text-text-3">{label}</dt>
                <dd className="mt-1 text-lg font-bold text-text-1">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 leading-relaxed text-text-2">{t(`descriptions.${state}`)}</p>
          <p className="mt-3 leading-relaxed text-text-2">{t("sameServer", { server: t(`servers.${room.shard}`) })}</p>
        </> : <>
          <h1 id="room-title" className="text-3xl font-bold text-text-1">{t(result.kind === "error" ? "errorTitle" : "unavailableTitle")}</h1>
          <p className="mt-5 leading-relaxed text-text-2">{t(result.kind === "error" ? "errorDescription" : "unavailableDescription")}</p>
        </>}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          {appURL && <a href={appURL} className={`${actionClass} bg-val-red text-bg-base hover:bg-val-red/85`}>{t("openApp")}</a>}
          <a href={APP_STORE_URL} className={`${actionClass} border border-border-med text-text-1 hover:border-jett-blue`}>{t("download")}</a>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-3">{t("installHint")}</p>
        {/* 原生連結重新讀取同一頁，避免 Next 的同路徑導航留在舊快照。 */}
        {appURL && <a href={`/${locale}/room/${id.toLowerCase()}`} className="mt-5 inline-flex min-h-11 items-center font-ui text-text-2 underline underline-offset-4 hover:text-jett-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue">{t(result.kind === "error" ? "retry" : "refresh")}</a>}
      </section>
    </div>
  );
}
