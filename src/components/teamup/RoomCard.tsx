"use client";

import { useLocale, useTranslations } from "next-intl";
import { rankIconURL } from "@/lib/ratings/format";
import { roomQueueKey } from "@/lib/teamup/room";
import { isFull, playerCardURL, roleIconURL, type ListedMember, type ListedRoom } from "@/lib/teamup/rooms";
import { tierName } from "@/lib/teamup/tiers";
import RoomCodeButton from "./RoomCodeButton";

/** 伺服器先算好的字串：相對時間與語言名稱各環境的 ICU 不一樣，在瀏覽器重算會對不上。 */
export interface RoomView extends ListedRoom {
  openedAgo: string;
  langLabel: string | null;
}

/** 牌階圖示。label 是讀屏念的字；null＝旁邊已經有文字說了，圖示只是裝飾。 */
function TierIcon({ tier, size, label }: { tier: number | null; size: number; label: string | null }) {
  const url = tier === null ? null : rankIconURL(tier);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- 外部 CDN 的小圖示，跟評分頁一樣用 img
  return <img src={url} alt={label ?? ""} width={size} height={size} loading="lazy" className="shrink-0" />;
}

function CardThumb({ cardId, size }: { cardId: string | null; size: number }) {
  if (!cardId) return <span aria-hidden="true" className="shrink-0 bg-bg-elevated" style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element -- 外部 CDN 的玩家卡片
  return <img src={playerCardURL(cardId)} alt="" width={size} height={size} loading="lazy" className="shrink-0 object-cover" />;
}

function MemberName({ member }: { member: ListedMember }) {
  const t = useTranslations("rooms");
  if (!member.gameName) return <span className="italic text-text-3">{t("incognito")}</span>;
  return (
    <span className="min-w-0 break-all text-text-1">
      {member.gameName}
      {member.tagLine && <span className="text-text-3">#{member.tagLine}</span>}
    </span>
  );
}

/** 在隊裡的人：卡片、名字（隱身的不給）、牌階。列表與單一房間頁共用。 */
export function RoomMembers({ members }: { members: ListedMember[] }) {
  const t = useTranslations("rooms");
  const locale = useLocale();
  return (
    <div>
      <p className="font-ui text-xs uppercase tracking-widest text-text-3">{t("members")}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {members.map((member, index) => (
          // 成員沒有公開的 id（puuid 只給房主），伺服器排好的順序就是身分。
          <li key={index} className="flex min-w-0 items-center gap-2 text-sm">
            <CardThumb cardId={member.cardId} size={24} />
            <MemberName member={member} />
            <TierIcon tier={member.tier} size={18} label={tierName(member.tier, locale)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RoomCard({ room, codesEnabled, fetchedAt }: {
  room: RoomView;
  codesEnabled: boolean;
  /** 這次讀取的時間；換了就把代碼按鈕歸零（見下）。 */
  fetchedAt: string;
}) {
  const t = useTranslations("rooms");
  const locale = useLocale();
  const roomT = useTranslations("room");
  const full = isFull(room);
  const host = room.members.find((member) => member.isHost) ?? null;
  const serverLabel = roomT(`servers.${room.shard}`);
  const avgTier = room.avgTier === null ? null : Math.round(room.avgTier);
  const chip = "inline-flex items-center gap-1.5 border border-border-dim bg-bg-elevated px-2 py-1 font-ui text-xs text-text-2";

  return (
    <article aria-labelledby={`room-${room.id}`}
      className={`flex w-full flex-col gap-4 border border-border-med bg-bg-panel p-5 md:p-6 ${full ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-jett-blue px-2 py-0.5 font-ui text-xs font-bold text-jett-blue">{serverLabel}</span>
        <span className={chip}>{roomT(`queues.${roomQueueKey(room.queue)}`)}</span>
        {full && <span className="border border-border-med px-2 py-0.5 font-ui text-xs font-bold text-text-2">{t("full")}</span>}
        <span className="ml-auto font-ui text-xs text-text-3">{t("openedAgo", { time: room.openedAgo })}</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={`room-${room.id}`} className="break-words text-xl font-bold leading-snug text-text-1">{room.title}</h2>
          {host && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <CardThumb cardId={host.cardId} size={28} />
              <MemberName member={host} />
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TierIcon tier={avgTier} size={32}
            label={tierName(avgTier, locale) && t("avgRank", { tier: tierName(avgTier, locale) ?? "" })} />
          <span className="font-ui text-base font-bold tabular-nums text-text-1">{roomT("playerCount", { count: room.memberCount })}</span>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2">
        {room.rankMin !== null && room.rankMax !== null && (
          <li className={chip}>
            {t("wantedRank")}
            <span aria-hidden="true" className="inline-flex items-center gap-1.5">
              <TierIcon tier={room.rankMin} size={16} label={null} />
              –
              <TierIcon tier={room.rankMax} size={16} label={null} />
            </span>
            <span className="sr-only">
              {t("rankRange", { min: tierName(room.rankMin, locale) ?? String(room.rankMin), max: tierName(room.rankMax, locale) ?? String(room.rankMax) })}
            </span>
          </li>
        )}
        <li className={chip}>{t(`mic.${room.mic}`)}</li>
        {room.wantedRoles.length > 0 && (
          <li className={chip}>
            {t("wantedRoles")}
            {room.wantedRoles.map((role) => (
              <span key={role} className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- 外部 CDN 的職業圖示 */}
                <img src={roleIconURL(role)} alt="" width={14} height={14} />
                {t(`roles.${role}`)}
              </span>
            ))}
          </li>
        )}
        {room.langLabel && <li className={chip}>{room.langLabel}</li>}
      </ul>

      {room.queueEligible === false && (
        <p className="text-sm text-gold">{t("queueIneligible")}</p>
      )}

      {room.members.length > 0 && <RoomMembers members={room.members} />}

      <div className="border-t border-border-dim pt-4">
        {/* 每次重新整理都歸零：房主可能換了代碼、房間可能滿了，網頁代碼也可能剛被打開或關掉。 */}
        <RoomCodeButton key={fetchedAt} roomId={room.id} serverLabel={serverLabel} codesEnabled={codesEnabled} full={full} />
      </div>
    </article>
  );
}
