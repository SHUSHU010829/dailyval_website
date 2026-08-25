"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import {
  profilesByIds,
  unblockUser,
  EsportsServiceError,
} from "@/lib/esports/rating-service";
import { playerCardSmallArtURL } from "@/lib/esports/constants";
import type { ProfileRow } from "@/lib/esports/types";

// 封鎖名單管理。封鎖必須可逆，否則就是陷阱——這份清單跟著帳號面板
// 一起出現。解除封鎖進行中時停用該列的按鈕（以構造消除重排序競態，
// 對應 iOS 用 ticket chain 解的同一個問題）。

export default function BlockedUsersList() {
  const t = useTranslations("esports.profile");
  const tError = useTranslations("esports.errors");
  const session = useEsportsSession();

  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const generationSeen = useRef(session.generation);

  const blockedKey = [...session.blockedIDs].sort().join(",");
  useEffect(() => {
    let cancelled = false;
    generationSeen.current = session.generation;
    const ids = blockedKey ? blockedKey.split(",") : [];
    // 空清單不用抓 profile（render 的第一個分支就處理掉了）
    if (ids.length === 0) {
      return () => {
        cancelled = true;
      };
    }
    profilesByIds(ids)
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .catch(() => {
        if (!cancelled) setProfiles(null);
      });
    return () => {
      cancelled = true;
    };
  }, [blockedKey, session.generation]);

  async function handleUnblock(targetID: string) {
    const uid = session.uid;
    if (!uid || pending.has(targetID)) return;
    setPending((previous) => new Set(previous).add(targetID));
    setError(null);
    try {
      await unblockUser(targetID, uid);
      session.setBlockedLocally(targetID, false);
    } catch (unblockError) {
      const kind =
        unblockError instanceof EsportsServiceError ? unblockError.kind : "network";
      setError(tError(kind));
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(targetID);
        return next;
      });
    }
  }

  return (
    <section aria-label={t("blockedUsers")}>
      <h3 className="font-ui text-xs font-bold uppercase tracking-widest text-text-3">
        {t("blockedUsers")}
      </h3>

      {session.blockedIDs.size === 0 ? (
        <p className="mt-2 font-ui text-xs text-text-3">{t("noBlockedUsers")}</p>
      ) : profiles === null ? (
        <p role="status" className="mt-2 font-ui text-xs text-text-3">
          {t("loadingBlocked")}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border-dim border-y border-border-dim">
          {[...session.blockedIDs].map((targetID) => {
            const profile = profiles.find((row) => row.id === targetID);
            return (
              <li key={targetID} className="flex items-center gap-3 py-2.5">
                <span className="h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-bg-elevated">
                  {profile?.avatar_card_id && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playerCardSmallArtURL(profile.avatar_card_id)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-1">
                  {profile?.display_name ?? t("unknownUser")}
                </span>
                <button
                  type="button"
                  disabled={pending.has(targetID)}
                  onClick={() => void handleUnblock(targetID)}
                  className="font-ui text-xs uppercase tracking-widest text-text-3 underline-offset-4 transition-colors hover:text-text-1 hover:underline disabled:opacity-50"
                >
                  {t("unblock")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-2 font-ui text-xs text-val-red">
          {error}
        </p>
      )}
    </section>
  );
}
