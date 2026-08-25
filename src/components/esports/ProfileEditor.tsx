"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { setProfile, EsportsServiceError } from "@/lib/esports/rating-service";
import { playerCardSmallArtURL } from "@/lib/esports/constants";

// 個人資料編輯：顯示名稱（1–30 字）＋ playercard 頭像挑選。
// iOS 端會用 Riot 帳號身分同步蓋掉這裡改的資料（設計如此——iOS 的
// Riot 識別優先）；名稱與內容的驗證都在伺服器端（invalid_name /
// objectionable_content），這裡只做長度的前置檢查。

const NAME_LIMIT = 30;
const CARDS_PAGE = 48;

interface PlayerCard {
  uuid: string;
  displayName: string;
}

export default function ProfileEditor() {
  const t = useTranslations("esports.profile");
  const tError = useTranslations("esports.errors");
  const session = useEsportsSession();

  // 未動過的欄位顯示 profile 現值（晚到也能帶入）；動過就以編輯值為準
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const name = nameEdit ?? session.profile?.display_name ?? "";
  const [cardEdit, setCardEdit] = useState<{ value: string | null } | null>(null);
  const cardID = cardEdit ? cardEdit.value : session.profile?.avatar_card_id ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cards, setCards] = useState<PlayerCard[] | null>(null);
  const [visibleCards, setVisibleCards] = useState(CARDS_PAGE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!pickerOpen || cards !== null) return;
    let cancelled = false;
    fetch("https://valorant-api.com/v1/playercards")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelled || !Array.isArray(json?.data)) return;
        setCards(
          json.data
            .filter((card: { uuid?: string }) => typeof card?.uuid === "string")
            .map((card: { uuid: string; displayName?: string }) => ({
              uuid: card.uuid.toLowerCase(),
              displayName: card.displayName ?? "",
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, cards]);

  async function handleSave() {
    const uid = session.uid;
    if (!uid || saving) return;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > NAME_LIMIT) {
      setMessage({ kind: "error", text: tError("invalid_name") });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await setProfile({ displayName: trimmed, avatarCardID: cardID, expectedUID: uid });
      await session.refreshProfile();
      setMessage({ kind: "ok", text: t("saved") });
    } catch (error) {
      const kind = error instanceof EsportsServiceError ? error.kind : "network";
      setMessage({ kind: "error", text: tError(kind) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label={t("title")}>
      <h3 className="font-ui text-xs font-bold uppercase tracking-widest text-text-3">
        {t("title")}
      </h3>

      <div className="mt-3 flex items-start gap-4">
        {/* 頭像＋更換 */}
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className="group flex shrink-0 flex-col items-center gap-1"
        >
          <span className="h-14 w-14 overflow-hidden rounded-md border border-border-med bg-bg-elevated transition-colors group-hover:border-border-bright">
            {cardID && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={playerCardSmallArtURL(cardID)} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="font-ui text-[10px] uppercase tracking-widest text-jett-blue">
            {t("changeAvatar")}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <label className="block font-ui text-xs text-text-3" htmlFor="esports-display-name">
            {t("displayName")}
          </label>
          <input
            id="esports-display-name"
            type="text"
            value={name}
            maxLength={NAME_LIMIT}
            onChange={(event) => setNameEdit(event.target.value)}
            className="cut-sm mt-1 w-full border border-border-med bg-bg-elevated px-3 py-2 text-sm text-text-1 transition-colors focus:border-val-red focus:outline-none"
          />
          <p className="mt-1 text-right font-ui text-[11px] tabular-nums text-text-3">
            {name.trim().length}/{NAME_LIMIT}
          </p>
        </div>
      </div>

      {pickerOpen && (
        <div className="mt-3">
          {cards === null ? (
            <p role="status" className="py-4 text-center font-ui text-xs text-text-3">
              {t("loadingCards")}
            </p>
          ) : cards.length === 0 ? (
            <p className="py-4 text-center font-ui text-xs text-text-3">{t("cardsFailed")}</p>
          ) : (
            <>
              <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto md:grid-cols-8">
                {cards.slice(0, visibleCards).map((card) => (
                  <button
                    key={card.uuid}
                    type="button"
                    title={card.displayName}
                    onClick={() => {
                      setCardEdit({ value: card.uuid });
                      setPickerOpen(false);
                    }}
                    className={`aspect-square overflow-hidden rounded-sm border transition-colors ${
                      cardID === card.uuid
                        ? "border-val-red"
                        : "border-border-dim hover:border-border-bright"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={playerCardSmallArtURL(card.uuid)}
                      alt={card.displayName}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {visibleCards < cards.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCards((count) => count + CARDS_PAGE)}
                  className="mt-2 w-full py-1.5 text-center font-ui text-xs uppercase tracking-widest text-text-3 transition-colors hover:text-text-1"
                >
                  {t("moreCards")}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="cut-sm bg-val-red px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`font-ui text-xs ${
              message.kind === "ok" ? "text-viper-green" : "text-val-red"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
