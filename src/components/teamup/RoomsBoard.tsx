"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LISTED_SHARDS, QUEUE_FILTERS, queueFilterOf, type ListedShard, type QueueFilter } from "@/lib/teamup/rooms";
import RoomCard, { type RoomView } from "./RoomCard";

type ServerChoice = "all" | ListedShard;
type QueueChoice = "all" | QueueFilter;

const subscribeNever = () => () => {};

/** 更新時間用瀏覽器的時區顯示；伺服器不知道訪客在哪個時區，所以伺服器那一次不畫。 */
function UpdatedAt({ fetchedAt }: { fetchedAt: string }) {
  const t = useTranslations("rooms");
  const locale = useLocale();
  const onClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!onClient) return null;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .format(new Date(fetchedAt));
  return <span className="font-ui text-xs text-text-3">{t("updatedAt", { time })}</span>;
}

function FilterGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-ui text-xs uppercase tracking-widest text-text-3">{label}</span>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button key={option.value} type="button" aria-pressed={selected} onClick={() => onChange(option.value)}
            className={`cut-sm inline-flex min-h-10 items-center gap-2 border px-3 py-1.5 font-ui text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue ${
              selected ? "border-val-red bg-val-red text-bg-base" : "border-border-med text-text-2 hover:border-border-bright hover:text-text-1"}`}>
            {option.label}
            <span className={`tabular-nums ${selected ? "text-bg-base/80" : "text-text-3"}`}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 揪團列表：所有伺服器的房一次讀進來，篩選在瀏覽器裡做，不再問伺服器。
 * 重新整理是使用者按的（router.refresh 重跑伺服器端的讀取），不輪詢。
 */
export default function RoomsBoard({ rooms, codesEnabled, failedServers, fetchedAt }: {
  rooms: RoomView[];
  codesEnabled: boolean;
  /** 讀不到的伺服器，伺服器端照語系串好；null＝全部讀到。 */
  failedServers: string | null;
  fetchedAt: string;
}) {
  const t = useTranslations("rooms");
  const roomT = useTranslations("room");
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [server, setServer] = useState<ServerChoice>("all");
  const [queue, setQueue] = useState<QueueChoice>("all");

  // 每一組的數字算的是「另一組的篩選套上之後」還剩幾間，點下去看到的就是那個數。
  const inServer = rooms.filter((room) => server === "all" || room.shard === server);
  const inQueue = rooms.filter((room) => queue === "all" || queueFilterOf(room.queue) === queue);
  const shown = inServer.filter((room) => queue === "all" || queueFilterOf(room.queue) === queue);

  const serverOptions = [
    { value: "all" as ServerChoice, label: t("allServers"), count: inQueue.length },
    ...LISTED_SHARDS.map((shard) => ({
      value: shard as ServerChoice, label: roomT(`servers.${shard}`),
      count: inQueue.filter((room) => room.shard === shard).length,
    })),
  ];
  const queueOptions = [
    { value: "all" as QueueChoice, label: t("allQueues"), count: inServer.length },
    ...QUEUE_FILTERS.map((key) => ({
      value: key as QueueChoice, label: roomT(`queues.${key}`),
      count: inServer.filter((room) => queueFilterOf(room.queue) === key).length,
    })),
  ];
  const filtered = server !== "all" || queue !== "all";

  return (
    <section aria-label={t("heading")}>
      <div className="flex flex-col gap-3 border-y border-border-med py-4" role="search" aria-label={t("filtersLabel")}>
        <FilterGroup label={t("serverFilter")} options={serverOptions} value={server} onChange={setServer} />
        <FilterGroup label={t("queueFilter")} options={queueOptions} value={queue} onChange={setQueue} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-ui text-sm font-bold text-text-1" aria-live="polite">{t("roomCount", { count: shown.length })}</p>
        <UpdatedAt fetchedAt={fetchedAt} />
        <button type="button" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}
          className="cut-sm ml-auto inline-flex min-h-10 items-center border border-border-med px-4 py-1.5 font-ui text-sm font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-jett-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue disabled:text-text-3">
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      {failedServers && (
        <p role="alert" className="mt-4 border border-gold/60 px-4 py-3 text-sm text-text-1">
          {t("partialError", { servers: failedServers })}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="mt-6 border border-border-med bg-bg-panel p-8 text-center">
          <h2 className="text-lg font-bold text-text-1">{filtered && rooms.length > 0 ? t("filteredTitle") : t("emptyTitle")}</h2>
          {filtered && rooms.length > 0 ? (
            <button type="button" onClick={() => { setServer("all"); setQueue("all"); }}
              className="mt-4 font-ui text-sm font-bold text-jett-blue underline underline-offset-4">
              {t("clearFilters")}
            </button>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-text-2">{t("emptyDescription")}</p>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {shown.map((room) => (
            <li key={room.id} className="flex"><RoomCard room={room} codesEnabled={codesEnabled} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}
