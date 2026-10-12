import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AppStoreQRCode from "@/components/AppStoreQRCode";
import RoomsBoard from "@/components/teamup/RoomsBoard";
import type { RoomView } from "@/components/teamup/RoomCard";
import { formatRelativeTime } from "@/lib/ratings/format";
import { buildMetadata } from "@/lib/seo";
import { APP_STORE_URL } from "@/lib/site-config";
import { fetchOpenRooms, type ListedRoom } from "@/lib/teamup/rooms";

// 房間只活幾分鐘，每次都要讀新的。
export const dynamic = "force-dynamic";
type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.rooms" });
  return buildMetadata({ locale, title: t("title"), description: t("description"), path: "/rooms" });
}

function languageLabel(lang: string | null, locale: string): string | null {
  if (!lang) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(lang) ?? lang;
  } catch {
    return lang;
  }
}

// 相對時間與語言名稱在這裡算好：瀏覽器的 ICU 跟伺服器不一樣，重算會對不上。
// 開房多久是跟這次讀取的時間比，不是跟訪客的時鐘比。
function view(room: ListedRoom, locale: string, fetchedAt: string): RoomView {
  return {
    ...room,
    openedAgo: formatRelativeTime(Date.parse(room.createdAt), locale, Date.parse(fetchedAt)),
    langLabel: languageLabel(room.lang, locale),
  };
}

export default async function RoomsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, roomT, result] = await Promise.all([
    getTranslations("rooms"), getTranslations("room"), fetchOpenRooms(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-12 md:py-20">
      <header className="mb-8">
        <p className="mb-3 font-ui text-xs uppercase tracking-[0.3em] text-val-red" aria-hidden="true">{t("eyebrow")}</p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">{t("heading")}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-2">{t("intro")}</p>
        <ol className="mt-5 grid gap-2 text-sm text-text-2 sm:grid-cols-3" aria-label={t("steps.title")}>
          {(["server", "copy", "join"] as const).map((step, index) => (
            <li key={step} className="flex gap-3 border border-border-dim bg-bg-panel px-4 py-3">
              <span className="font-display font-black text-val-red" aria-hidden="true">{index + 1}</span>
              <span>{t(`steps.${step}`)}</span>
            </li>
          ))}
        </ol>
      </header>

      {result.kind === "rooms" ? (
        <RoomsBoard
          rooms={result.rooms.map((room) => view(room, locale, result.fetchedAt))}
          codesEnabled={result.codesEnabled}
          failedServers={result.failedShards.length > 0
            ? new Intl.ListFormat(locale, { type: "conjunction" })
              .format(result.failedShards.map((shard) => roomT(`servers.${shard}`)))
            : null}
          fetchedAt={result.fetchedAt}
        />
      ) : (
        <section className="border border-border-med bg-bg-panel p-8">
          <h2 className="text-xl font-bold text-text-1">{t(result.kind === "error" ? "errorTitle" : "unavailableTitle")}</h2>
          <p className="mt-3 leading-relaxed text-text-2">{t(result.kind === "error" ? "errorDescription" : "unavailableDescription")}</p>
          {/* 原生連結重新讀取整頁，不留在舊的 RSC 快照上。 */}
          <a href={`/${locale}/rooms`} className="mt-5 inline-flex min-h-11 items-center font-ui text-text-2 underline underline-offset-4 hover:text-jett-blue">
            {t("refresh")}
          </a>
        </section>
      )}

      <aside className="mt-12 flex flex-col gap-6 border border-border-med bg-bg-panel p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h2 className="text-lg font-bold text-text-1">{t("appTitle")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-2">{t("appDescription")}</p>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
            className="cut mt-4 inline-flex min-h-11 items-center bg-val-red px-5 py-2 font-ui text-sm font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue">
            {t("download")}
          </a>
        </div>
        <AppStoreQRCode />
      </aside>
    </div>
  );
}
