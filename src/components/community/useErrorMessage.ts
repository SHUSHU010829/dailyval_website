"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  SocialServiceError,
  type SocialErrorKind,
} from "@/lib/community/errors";
import { ImagePrepareError } from "@/lib/community/image-compress";

const KEY_FOR_KIND: Record<SocialErrorKind, string> = {
  not_signed_in: "notSignedIn",
  banned: "banned",
  feature_disabled: "featureDisabled",
  rate_limited: "rateLimited",
  objectionable_content: "objectionable",
  invalid_body: "invalidBody",
  too_many_images: "tooManyImages",
  invalid_image: "imageUploadFailed",
  post_not_found: "postNotFound",
  comment_not_found: "commentNotFound",
  forbidden: "forbidden",
  invalid_target: "forbidden",
  network: "network",
  unknown: "unknown",
};

/** 把伺服器／上傳錯誤翻成一句人看得懂的話（communityBoard.errors） */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations("communityBoard.errors");
  return useCallback(
    (error: unknown) => {
      if (error instanceof SocialServiceError)
        return t(KEY_FOR_KIND[error.kind]);
      if (error instanceof ImagePrepareError) {
        return t(
          error.kind === "too_large" ? "imageTooLarge" : "imageUnsupported",
        );
      }
      return t("unknown");
    },
    [t],
  );
}
