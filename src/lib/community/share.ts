// 分享貼文連結。行動裝置優先用 Web Share API，其餘複製到剪貼簿。
// 不直接跳提示：回傳結果由呼叫端交給 CommunityNoticeProvider 顯示。

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export interface ShareData {
  title?: string;
  text?: string;
  url: string;
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function sharePost(data: ShareData): Promise<ShareResult> {
  if (isMobileDevice() && "share" in navigator) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // 使用者自己關掉分享面板不是失敗，也不該再偷偷複製
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  return (await copyToClipboard(data.url)) ? "copied" : "failed";
}

export function postURL(locale: string, postId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/${locale}/community/post/${postId}`;
}
