"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";

interface CreatorVideoCardProps {
  /** 影片檔案路徑（public/ 底下） */
  src: string;
  /** 創作者頭像圖片路徑（public/ 底下） */
  avatarSrc: string;
  /** IG 貼文代碼，用於組出原始貼文連結 */
  igCode: string;
  /** 影片文案 */
  caption: string;
  /** 創作者顯示名稱，如「橘毛」 */
  creatorName: string;
  /** 創作者 IG handle，如「@orangemaooo」 */
  creatorHandle: string;
  /** 合作標籤文案，如「與 DAILYVAL 合作」 */
  collabLabel: string;
  /** 查看原始貼文的連結文案 */
  viewOriginalLabel: string;
}

/**
 * 創作者合作影片卡片（IG Reels 排版 + 站內 HUD 系統風格）
 * - 影片進入畫面才自動播放（節省流量），預設靜音、可點擊切換音量
 * - 頂部仿 IG 貼文 header：漸層圈頭像照片 + 創作者資訊 + 合作標籤
 * - 底部提供導向原始 IG 貼文的連結
 */
export default function CreatorVideoCard({
  src,
  avatarSrc,
  igCode,
  caption,
  creatorName,
  creatorHandle,
  collabLabel,
  viewOriginalLabel,
}: CreatorVideoCardProps) {
  const t = useTranslations("creators.examples");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // 影片進入視窗才播放，離開視窗暫停，避免多支影片同時佔用頻寬
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="cut flex w-full max-w-[320px] flex-col border border-border-med bg-bg-panel transition-colors hover:border-val-red/50">
      {/* 頂部：仿 IG 貼文 header，強調與 DailyVal 合作 */}
      <div className="flex items-center gap-3 border-b border-border-med px-4 py-3">
        <div className="avatar-ring h-10 w-10 shrink-0 rounded-full p-[2px]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-bg-panel">
            <Image src={avatarSrc} alt={creatorName} fill sizes="40px" className="object-cover" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-bold text-text-1">{creatorName}</p>
          <p className="truncate font-ui text-xs text-text-3">{creatorHandle}</p>
        </div>
        <span className="shrink-0 cut-sm border border-val-red/30 bg-val-red/10 px-2 py-1 font-ui text-[10px] font-bold uppercase tracking-widest text-val-red">
          {collabLabel}
        </span>
      </div>

      {/* 影片區：9:16 直式，模擬 IG Reels 畫面比例 */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={src}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          onClick={togglePlay}
          className="h-full w-full cursor-pointer object-cover"
        />

        {!isPlaying && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <div className="flex h-14 w-14 items-center justify-center border border-border-bright bg-bg-base/80 text-text-1">
              <Icon name="Play" size={24} weight="fill" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* 靜音切換：HUD 風格小按鈕 */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? t("unmute") : t("mute")}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center border border-border-bright bg-bg-base/70 text-text-1 transition-colors hover:border-val-red/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red"
        >
          <Icon name={isMuted ? "SpeakerSlash" : "SpeakerHigh"} size={16} weight="bold" aria-hidden="true" />
        </button>

        {/* 掃描線疊加，呼應站內系統風格 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
        />
      </div>

      {/* 底部：文案 + 導向原始貼文連結 */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="text-sm leading-relaxed text-text-2">{caption}</p>
        <a
          href={`https://www.instagram.com/p/${igCode}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-widest text-jett-blue transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
        >
          <Icon name="InstagramLogo" size={14} weight="bold" aria-hidden="true" />
          {viewOriginalLabel}
          <Icon
            name="ArrowSquareOut"
            size={12}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  );
}
