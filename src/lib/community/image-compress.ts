"use client";

// 上傳前的壓縮，與 iOS ImageCompressor 同一組數字：
// 原圖最長邊 2048、目標 500 KB；縮圖最長邊 1080、目標 160 KB。
// 伺服器的硬上限是 2 MB / 256 KB，簽章裡就簽了 Content-Length，超過的話
// R2 在讀 body 之前就 403——所以位元組數必須先算好再去要票。

const MAX_DIMENSION = 2048;
const TARGET_BYTES = 500_000;
const HARD_LIMIT_BYTES = 2_097_152;
const THUMB_MAX_DIMENSION = 1080;
const THUMB_TARGET_BYTES = 160_000;
const THUMB_HARD_LIMIT_BYTES = 262_144;
const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.35, 0.2];

export interface PreparedImage {
  original: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  /** 給預覽用；呼叫端負責 revokeObjectURL */
  previewURL: string;
}

export class ImagePrepareError extends Error {
  readonly kind: "unsupported" | "too_large";
  constructor(kind: "unsupported" | "too_large") {
    super(kind);
    this.kind = kind;
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // from-image：照 EXIF 方向擺正，手機直拍才不會躺著上去
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepareError("unsupported");
  }
}

function fit(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const ratio = maxDimension / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function toJPEG(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

/**
 * 最長邊壓到 maxDimension（不放大），再一路降品質直到塞進 targetBytes；
 * 最低品質仍超過 hardLimit 就放棄，這張圖沒辦法上。
 */
async function encode(
  bitmap: ImageBitmap,
  maxDimension: number,
  targetBytes: number,
  hardLimit: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fit(bitmap.width, bitmap.height, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePrepareError("unsupported");
  // JPEG 沒有透明：透明 PNG 直接畫上去會變黑底，先鋪白
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toJPEG(canvas, quality);
    if (!blob) continue;
    if (blob.size <= targetBytes) return { blob, width, height };
    if (!smallest || blob.size < smallest.size) smallest = blob;
  }
  if (!smallest || smallest.size > hardLimit)
    throw new ImagePrepareError("too_large");
  return { blob: smallest, width, height };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await decode(file);
  try {
    const original = await encode(
      bitmap,
      MAX_DIMENSION,
      TARGET_BYTES,
      HARD_LIMIT_BYTES,
    );
    const thumbnail = await encode(
      bitmap,
      THUMB_MAX_DIMENSION,
      THUMB_TARGET_BYTES,
      THUMB_HARD_LIMIT_BYTES,
    );
    return {
      original: original.blob,
      thumbnail: thumbnail.blob,
      width: original.width,
      height: original.height,
      previewURL: URL.createObjectURL(original.blob),
    };
  } finally {
    bitmap.close();
  }
}
