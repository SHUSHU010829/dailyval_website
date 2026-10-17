"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import { SocialServiceError } from "@/lib/community/errors";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import { POST_IMAGE_LIMIT } from "@/lib/community/constants";
import {
  prepareImage,
  type PreparedImage,
} from "@/lib/community/image-compress";
import { uploadImages } from "@/lib/community/media-upload";
import {
  createPost as serviceCreatePost,
  postDetail,
} from "@/lib/community/service";
import type { SocialPost } from "@/lib/community/types";

// 發文：壓圖 → 直傳 R2 → create_post → 讀回完整的一列給列表插入。
//
// 貼文 id 由表單在草稿第一次送出時產生，並且一直沿用到成功為止：圖片的 key
// 排在它底下，而 create_post 對同一個 id 是冪等的，所以回應掉包後重按「發佈」
// 是同一篇，不是第二篇。這裡不自己產 id，正是為了不讓每次重試變成新的一篇。

export interface CreatePostOptions {
  /** 表單的草稿 id，重試時原樣帶回來 */
  postId: string;
  onSuccess?: (post: SocialPost) => void;
}

export function useCreatePost() {
  const t = useTranslations("communityBoard.composer");
  const tErrors = useTranslations("communityBoard.errors");
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const { uid, canPost } = useCommunitySession();
  const [isUploading, setIsUploading] = useState(false);

  /** 回傳 true 代表已發表；false 代表這次失敗，草稿要留著 */
  const createPost = async (
    content: string,
    files: File[],
    { postId, onSuccess }: CreatePostOptions,
  ): Promise<boolean> => {
    // 帳號在互動當下抓住；之後換人由伺服器以 uid_mismatch 擋下
    const expectedUid = uid;
    if (!expectedUid) {
      // 組稿器開著的時候在別的分頁登出了：要的是重新登入，不是去 App 綁定
      notify("error", tErrors("notSignedIn"));
      return false;
    }
    if (!canPost) {
      notify("error", t("bindAccountFirst"));
      return false;
    }
    if (files.length > POST_IMAGE_LIMIT) {
      notify("error", t("imageLimitReached", { max: POST_IMAGE_LIMIT }));
      return false;
    }
    const body = content.trim();
    if (!body && files.length === 0) {
      notify("error", t("emptyPost"));
      return false;
    }

    // 讀回伺服器算好的那一列（署名、計數、圖片 key）。null 代表這一篇在伺服器上
    // 但這位觀看者看不到——發表後被審核下架就是這樣。那仍然是「發出去了」：
    // 草稿要收掉，不能讓人一直重試一篇早就存在的貼文。
    const readBack = async (): Promise<SocialPost | null> => {
      const post = await postDetail(postId);
      if (post && post.author.id !== expectedUid) {
        // uuid 不會意外撞到，這是 bug 或竄改過的客戶端
        throw new SocialServiceError("unknown", "id_taken");
      }
      return post;
    };

    const publish = async (): Promise<SocialPost | null> => {
      setIsUploading(true);
      let prepared: PreparedImage[] = [];
      try {
        prepared = await Promise.all(files.map(prepareImage));
        let uploaded;
        try {
          uploaded = await uploadImages(prepared, {
            scope: "post",
            targetId: postId,
            expectedUid,
          });
        } catch (error) {
          // 這個 id 的貼文已經在伺服器上了（上一次 create_post 寫進去了但回應掉了，
          // 或是讀回那一步失敗）：圖片的票對已經發表的目標會拒發，所以到不了
          // create_post 自己的冪等出口，這裡要認得出來
          if (
            error instanceof SocialServiceError &&
            error.message === "target_exists"
          ) {
            const existing = await readBack();
            if (existing) onSuccess?.(existing);
            return existing;
          }
          throw error;
        }
        await serviceCreatePost({
          id: postId,
          body,
          images: uploaded,
          expectedUid,
        });
        const post = await readBack();
        if (post) onSuccess?.(post);
        return post;
      } finally {
        for (const image of prepared) URL.revokeObjectURL(image.previewURL);
        setIsUploading(false);
      }
    };

    // 提示由這裡負責；呼叫端只需要知道成功與否
    try {
      const post = await publish();
      notify(
        "success",
        post === null
          ? t("postPublishedHidden")
          : post.images.length > 0
            ? t("postWithImagesSuccess")
            : t("postSuccess"),
      );
      return true;
    } catch (error) {
      notify("error", describe(error));
      return false;
    }
  };

  return { createPost, isUploading };
}
