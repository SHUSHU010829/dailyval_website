"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { safeRaw } from "@/lib/safe-raw";
import HudSelect from "@/components/creators/HudSelect";

// Google Apps Script webhook（未設定時送出會顯示錯誤與客服信箱）
const ENDPOINT = process.env.NEXT_PUBLIC_CREATOR_FORM_ENDPOINT;
// 防機器人：低於此秒數即送出視為 spam，靜默丟棄
const MIN_SUBMIT_SECONDS = 5;

type Status = "idle" | "submitting" | "success" | "error";

/** 表單欄位共用樣式 */
const inputClass =
  "cut-sm w-full border border-border-med bg-bg-elevated px-4 py-3 text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none";
const labelClass =
  "mb-2 block font-ui text-xs font-bold uppercase tracking-widest text-text-2";

/**
 * 創作者計畫申請表單（Client Component)
 * - 以 text/plain 送 JSON 至 Apps Script，避免 CORS preflight
 * - 蜜罐欄位 + 最短填答時間雙重防濫用
 * - payload 欄位順序對應試算表欄位（見 campaign/creator-program-v2.md §8）
 */
export default function CreatorApplicationForm() {
  const t = useTranslations("creators.form");
  const [status, setStatus] = useState<Status>("idle");
  const [languages, setLanguages] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState("");
  const [monthlyOutput, setMonthlyOutput] = useState("");
  const [dailyvalUsage, setDailyvalUsage] = useState("");
  const [desiredTier, setDesiredTier] = useState("");
  const [source, setSource] = useState("");
  const [chipError, setChipError] = useState<
    "languages" | "platforms" | "followerCount" | "desiredTier" | "source" | null
  >(null);
  // 掛載時間，用於最短填答時間檢查
  const mountedAt = useRef(Date.now());

  const languageOptions = safeRaw(t, "options.languages", [] as string[]);
  const platformOptions = safeRaw(t, "options.platforms", [] as string[]);
  const followerOptions = safeRaw(t, "options.followerCount", [] as string[]);
  const outputOptions = safeRaw(t, "options.monthlyOutput", [] as string[]);
  const usageOptions = safeRaw(t, "options.dailyvalUsage", [] as string[]);
  const tierOptions = safeRaw(t, "options.desiredTier", [] as string[]);
  const sourceOptions = safeRaw(t, "options.source", [] as string[]);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    setChipError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (languages.length === 0) {
      setChipError("languages");
      return;
    }
    if (platforms.length === 0) {
      setChipError("platforms");
      return;
    }
    if (!followerCount) {
      setChipError("followerCount");
      return;
    }
    if (!desiredTier) {
      setChipError("desiredTier");
      return;
    }
    if (!source) {
      setChipError("source");
      return;
    }

    const data = new FormData(e.currentTarget);

    // 蜜罐有值或填答過快 → 視為機器人，假裝成功、不送出
    const elapsedSeconds = (Date.now() - mountedAt.current) / 1000;
    if (data.get("website") || elapsedSeconds < MIN_SUBMIT_SECONDS) {
      setStatus("success");
      return;
    }

    if (!ENDPOINT) {
      console.warn("[CreatorApplicationForm] NEXT_PUBLIC_CREATOR_FORM_ENDPOINT 未設定");
      setStatus("error");
      return;
    }

    const payload = {
      creatorName: data.get("creatorName"),
      email: data.get("email"),
      region: data.get("region"),
      languages: languages.join(", "),
      platforms,
      channelLinks: data.get("channelLinks"),
      followerCount,
      monthlyOutput,
      dailyvalUsage,
      representativeWorks: data.get("representativeWorks"),
      desiredTier,
      motivation: data.get("motivation"),
      source,
      termsAccepted: data.get("terms") === "on",
    };

    setStatus("submitting");
    try {
      // 不設 Content-Type header：預設 text/plain 可略過 CORS preflight
      const res = await fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="alert" className="cut border border-viper-green/40 bg-viper-green/5 p-10 text-center">
        <div className="mb-4 flex justify-center text-viper-green">
          <Icon name="CheckCircle" size={48} weight="bold" aria-hidden />
        </div>
        <h3 className="font-display text-xl font-bold uppercase tracking-tight text-text-1">
          {t("success.title")}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-text-2">{t("success.body")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* 蜜罐欄位：一般使用者看不到也不會填 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      <div>
        <label htmlFor="creatorName" className={labelClass}>{t("fields.creatorName")}</label>
        <input id="creatorName" name="creatorName" type="text" required maxLength={100} className={inputClass} />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>{t("fields.email")}</label>
        <input id="email" name="email" type="email" required maxLength={200} className={inputClass} />
      </div>

      <div>
        <label htmlFor="region" className={labelClass}>{t("fields.region")}</label>
        <input id="region" name="region" type="text" required maxLength={100} placeholder={t("fields.regionPlaceholder")} className={inputClass} />
      </div>

      {/* 語言複選 chips */}
      <fieldset className="md:col-span-2">
        <legend className={labelClass}>{t("fields.languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={languages.includes(option)}
              onClick={() => toggle(languages, option, setLanguages)}
              className={[
                "cut-sm border px-4 py-2 font-ui text-sm tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red",
                languages.includes(option)
                  ? "border-val-red bg-val-red/15 text-text-1"
                  : "border-border-med bg-bg-elevated text-text-2 hover:border-border-bright",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
        {chipError === "languages" && (
          <p className="mt-2 text-xs text-val-red">{t("validation.languages")}</p>
        )}
      </fieldset>

      {/* 平台複選 chips */}
      <fieldset className="md:col-span-2">
        <legend className={labelClass}>{t("fields.platforms")}</legend>
        <div className="flex flex-wrap gap-2">
          {platformOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={platforms.includes(option)}
              onClick={() => toggle(platforms, option, setPlatforms)}
              className={[
                "cut-sm border px-4 py-2 font-ui text-sm tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red",
                platforms.includes(option)
                  ? "border-val-red bg-val-red/15 text-text-1"
                  : "border-border-med bg-bg-elevated text-text-2 hover:border-border-bright",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
        {chipError === "platforms" && (
          <p className="mt-2 text-xs text-val-red">{t("validation.platforms")}</p>
        )}
      </fieldset>

      <div className="md:col-span-2">
        <label htmlFor="channelLinks" className={labelClass}>{t("fields.channelLinks")}</label>
        <textarea id="channelLinks" name="channelLinks" required rows={3} maxLength={1000} placeholder={t("fields.channelLinksPlaceholder")} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="representativeWorks" className={labelClass}>{t("fields.representativeWorks")}</label>
        <textarea id="representativeWorks" name="representativeWorks" required rows={3} maxLength={1000} placeholder={t("fields.representativeWorksPlaceholder")} className={inputClass} />
      </div>

      <div>
        <label htmlFor="followerCount" className={labelClass}>{t("fields.followerCount")}</label>
        <HudSelect
          id="followerCount"
          required
          invalid={chipError === "followerCount"}
          value={followerCount}
          onChange={(v) => { setFollowerCount(v); setChipError(null); }}
          options={followerOptions}
          placeholder={t("fields.selectPlaceholder")}
        />
        {chipError === "followerCount" && (
          <p className="mt-2 text-xs text-val-red">{t("validation.followerCount")}</p>
        )}
      </div>

      <div>
        <label htmlFor="monthlyOutput" className={labelClass}>{t("fields.monthlyOutput")}</label>
        <HudSelect
          id="monthlyOutput"
          value={monthlyOutput}
          onChange={setMonthlyOutput}
          options={outputOptions}
          placeholder={t("fields.selectPlaceholder")}
        />
      </div>

      <div>
        <label htmlFor="dailyvalUsage" className={labelClass}>{t("fields.dailyvalUsage")}</label>
        <HudSelect
          id="dailyvalUsage"
          value={dailyvalUsage}
          onChange={setDailyvalUsage}
          options={usageOptions}
          placeholder={t("fields.selectPlaceholder")}
        />
      </div>

      <div>
        <label htmlFor="desiredTier" className={labelClass}>{t("fields.desiredTier")}</label>
        <HudSelect
          id="desiredTier"
          required
          invalid={chipError === "desiredTier"}
          value={desiredTier}
          onChange={(v) => { setDesiredTier(v); setChipError(null); }}
          options={tierOptions}
          placeholder={t("fields.selectPlaceholder")}
        />
        {chipError === "desiredTier" && (
          <p className="mt-2 text-xs text-val-red">{t("validation.desiredTier")}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="motivation" className={labelClass}>{t("fields.motivation")}</label>
        <textarea id="motivation" name="motivation" rows={4} maxLength={2000} placeholder={t("fields.motivationPlaceholder")} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="source" className={labelClass}>{t("fields.source")}</label>
        <HudSelect
          id="source"
          required
          invalid={chipError === "source"}
          value={source}
          onChange={(v) => { setSource(v); setChipError(null); }}
          options={sourceOptions}
          placeholder={t("fields.selectPlaceholder")}
        />
        {chipError === "source" && (
          <p className="mt-2 text-xs text-val-red">{t("validation.source")}</p>
        )}
      </div>

      {/* 內容授權同意 */}
      <label className="md:col-span-2 flex cursor-pointer items-start gap-3 border border-border-med bg-bg-panel p-4">
        <input type="checkbox" name="terms" required className="checkbox-hud mt-0.5" />
        <span className="text-sm leading-relaxed text-text-2">{t("fields.terms")}</span>
      </label>

      {status === "error" && (
        <div role="alert" className="md:col-span-2 cut-sm border border-val-red/40 bg-val-red/5 p-4">
          <p className="font-ui text-sm font-bold uppercase tracking-wider text-val-red">{t("error.title")}</p>
          <p className="mt-1 text-sm text-text-2">{t("error.body")}</p>
        </div>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="cut w-full bg-val-red px-8 py-4 font-ui text-base font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red md:w-auto"
        >
          {status === "submitting" ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
