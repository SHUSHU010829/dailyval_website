"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Portal from "@/components/community/Portal";
import Icon from "@/components/Icon";
import type { SocialImage } from "@/lib/community/types";

// 貼文配圖（與 social 專案的顯示規則一致）：
// - 列表是橫向 scroll-snap 圖庫（單張不 snap），搬移過來的舊圖用原圖、新上傳的
//   用縮圖，見 mapping.ts 的 listURL
// - 手機直拍截圖（高寬比 < 0.6）固定 9:19.5 放大顯示，其餘用一般寬度
// - 點開是全螢幕大圖（最大 96vw × 96vh），可上下張、鍵盤與滑動切換；關閉後
//   圖庫會捲回剛看的那一張
// 圖片是 R2 上的永久網址，載入失敗就是真的失敗，「重新載入」只是換一個
// query string 讓瀏覽器再抓一次。

const PORTRAIT_RATIO = 0.6;
const SWIPE_THRESHOLD_PX = 50;

function withRetry(url: string, attempt: number): string {
  if (attempt === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}retry=${attempt}`;
}

function knownRatio(image: SocialImage): number | undefined {
  return image.width && image.height ? image.width / image.height : undefined;
}

/** 手機直拍截圖在列表裡放大一點顯示 */
function listStyles(ratio: number | undefined) {
  if (ratio !== undefined && ratio < PORTRAIT_RATIO) {
    return {
      container: "w-[55%] sm:w-[45%] md:w-[38%] lg:w-[32%]",
      image: "aspect-[9/19.5] object-cover",
      fallback: "aspect-[9/19.5]",
    };
  }
  return {
    container: "w-[70%] sm:w-[50%] md:w-[40%] lg:w-[35%]",
    image: "object-cover",
    fallback: "aspect-[5/3]",
  };
}

function ImageFallback({
  className,
  onRetry,
}: {
  className?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("communityBoard.errors");
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-bg-elevated p-4 text-text-3 ${className ?? ""}`}
    >
      <Icon name="ImageSquare" size={28} />
      <span className="font-body text-xs">{t("imageLoadFailed")}</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-ui text-xs underline underline-offset-2 hover:text-text-1"
      >
        {t("imageRetry")}
      </button>
    </div>
  );
}

function ListImage({
  image,
  index,
  ratio,
  onRatio,
  onOpen,
}: {
  image: SocialImage;
  index: number;
  ratio: number | undefined;
  onRatio: (ratio: number) => void;
  onOpen: () => void;
}) {
  const t = useTranslations("communityBoard.a11y");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const styles = listStyles(ratio);

  if (failed) {
    return (
      <ImageFallback
        className={`w-full ${styles.fallback}`}
        onRetry={() => {
          setFailed(false);
          setAttempt((count) => count + 1);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("postImage", { index: index + 1 })}
      className="cut-sm block w-full cursor-zoom-in overflow-hidden bg-bg-elevated transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-val-red"
    >
      <img
        src={withRetry(image.listURL, attempt)}
        alt={t("postImage", { index: index + 1 })}
        width={image.width ?? 500}
        height={image.height ?? 300}
        loading="lazy"
        decoding="async"
        onLoad={(event) => {
          const img = event.currentTarget;
          if (img.naturalHeight > 0) {
            onRatio(img.naturalWidth / img.naturalHeight);
          }
        }}
        onError={() => setFailed(true)}
        className={`h-auto w-full ${styles.image}`}
      />
    </button>
  );
}

function LightboxImage({
  image,
  index,
  total,
}: {
  image: SocialImage;
  index: number;
  total: number;
}) {
  const t = useTranslations("communityBoard.a11y");
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <div
      role="img"
      aria-label={t("viewingImage", { current: index + 1, total })}
      className="flex size-full items-center justify-center"
    >
      {failed ? (
        <ImageFallback
          className="h-40 w-64"
          onRetry={() => {
            setFailed(false);
            setLoaded(false);
            setAttempt((count) => count + 1);
          }}
        />
      ) : (
        <>
          {!loaded && (
            <span
              role="status"
              className="absolute font-ui text-xs uppercase tracking-widest text-white/60"
            >
              {t("loadingImage")}
            </span>
          )}
          <img
            src={withRetry(image.url, attempt)}
            alt={t("postImage", { index: index + 1 })}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setFailed(true);
              setLoaded(true);
            }}
            className={`max-h-[96vh] max-w-[96vw] object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </>
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: SocialImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const t = useTranslations("communityBoard.a11y");
  const hasPrevious = index > 0;
  const hasNext = index < images.length - 1;
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft" && hasPrevious) {
        event.preventDefault();
        onIndexChange(index - 1);
      } else if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, hasPrevious, hasNext, onClose, onIndexChange]);

  const controlClass =
    "absolute z-10 flex size-12 items-center justify-center rounded-full bg-black/40 text-white opacity-80 backdrop-blur-sm transition-colors hover:bg-val-red/40 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("imagePreview")}
      className="fixed inset-0 z-[100] bg-black/95"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const delta = event.changedTouches[0].clientX - start;
        if (delta > SWIPE_THRESHOLD_PX && hasPrevious) {
          onIndexChange(index - 1);
        } else if (delta < -SWIPE_THRESHOLD_PX && hasNext) {
          onIndexChange(index + 1);
        }
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("closeImagePreview")}
        className={`${controlClass} right-3 top-3`}
      >
        <Icon name="X" size={24} />
      </button>
      {hasPrevious && (
        <button
          type="button"
          onClick={() => onIndexChange(index - 1)}
          aria-label={t("previousImage")}
          className={`${controlClass} left-3 top-1/2 -translate-y-1/2`}
        >
          <Icon name="CaretLeft" size={26} />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={() => onIndexChange(index + 1)}
          aria-label={t("nextImage")}
          className={`${controlClass} right-3 top-1/2 -translate-y-1/2 rotate-180`}
        >
          <Icon name="CaretLeft" size={26} />
        </button>
      )}
      {/* key=index：換一張就是新的實例，載入／失敗狀態自然歸零 */}
      <LightboxImage
        key={index}
        image={images[index]}
        index={index}
        total={images.length}
      />
      {images.length > 1 && (
        <p
          aria-hidden
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 font-ui text-sm text-white backdrop-blur-sm"
        >
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

export default function PostImages({ images }: { images: SocialImage[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  // 載入後才知道的高寬比（資料庫沒有寬高的舊圖）
  const [measured, setMeasured] = useState<Record<number, number>>({});
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 關閉大圖時，圖庫捲回剛看的那一張（block: nearest 不會動到頁面的垂直位置）。
  // 副作用放在事件處理器裡，不放進 setState 的 updater
  const close = () => {
    const current = selected;
    setSelected(null);
    if (current === null) return;
    const node = itemRefs.current[current];
    // 等大圖卸載之後再捲動
    requestAnimationFrame(() =>
      node?.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      }),
    );
  };

  if (images.length === 0) return null;
  const single = images.length === 1;

  return (
    <>
      <div className="relative">
        <div
          className={
            single
              ? "overflow-hidden"
              : "snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          <div className="flex gap-2">
            {images.map((image, index) => {
              const ratio = knownRatio(image) ?? measured[index];
              return (
                <div
                  key={image.key}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  className={`flex-none ${single ? "" : "snap-start snap-always"} ${listStyles(ratio).container}`}
                >
                  <ListImage
                    image={image}
                    index={index}
                    ratio={ratio}
                    onRatio={(value) =>
                      setMeasured((current) =>
                        current[index] === value
                          ? current
                          : { ...current, [index]: value },
                      )
                    }
                    onOpen={() => setSelected(index)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {!single && (
          <div
            aria-hidden
            className="pointer-events-none mt-2 flex justify-center gap-1"
          >
            {images.map((image) => (
              <span
                key={image.key}
                className="size-1.5 rounded-full bg-text-3/60"
              />
            ))}
          </div>
        )}
      </div>
      {selected !== null && (
        <Portal>
          <Lightbox
            images={images}
            index={selected}
            onClose={close}
            onIndexChange={setSelected}
          />
        </Portal>
      )}
    </>
  );
}
