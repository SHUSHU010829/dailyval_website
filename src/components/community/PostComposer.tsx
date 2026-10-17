"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import AuthorBadge from "@/components/community/AuthorBadge";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import LinkRiotIdDialog from "@/components/community/LinkRiotIdDialog";
import { useCreatePost } from "@/components/community/useCreatePost";
import Portal from "@/components/community/Portal";
import HudModal from "@/components/esports/HudModal";
import Icon from "@/components/Icon";
import { POST_CHAR_LIMIT, POST_IMAGE_LIMIT } from "@/lib/community/constants";
import type { AuthorProfile, SocialPost } from "@/lib/community/types";

// 發文入口。收合時是一列「來分享些什麼」，點開在 HudModal 裡填寫。
//
// 只用 modal 一種版面（不依視窗寬度換對話框／抽屜）：換版面等於把表單卸載重掛，
// 草稿與它的 id 一起消失，上傳到一半的那篇就沒辦法重試——所以開著的期間版面
// 固定，上傳中也不讓關閉。

interface PostComposerProps {
  onPosted(post: SocialPost): void;
}

interface Picked {
  file: File;
  previewURL: string;
}

function ComposerForm({
  profile,
  isSubmitting,
  onSubmit,
}: {
  profile: AuthorProfile;
  isSubmitting: boolean;
  /** 回傳 true 代表已發表，表單才清空；false 代表失敗，草稿留著讓人重試 */
  onSubmit(content: string, files: File[], draftId: string): Promise<boolean>;
}) {
  const t = useTranslations("communityBoard.composer");
  const { notify } = useCommunityNotice();
  const [content, setContent] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 這份草稿的貼文 id：第一次送出時產生，成功之前每次重試都用同一個——
  // 伺服器對同一個 id 是冪等的，回應掉包後重按才不會發出第二篇
  const draftIdRef = useRef<string | null>(null);

  // 預覽用的 object URL 在表單消失時收掉
  const pickedRef = useRef<Picked[]>([]);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(
    () => () =>
      pickedRef.current.forEach((item) => URL.revokeObjectURL(item.previewURL)),
    [],
  );

  const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";
    if (!files) return;

    const remaining = POST_IMAGE_LIMIT - picked.length;
    if (remaining <= 0 || files.length > remaining) {
      notify("error", t("imageLimitReached", { max: POST_IMAGE_LIMIT }));
    }
    if (remaining <= 0) return;
    const toAdd = Array.from(files).slice(0, remaining);
    setPicked((current) => [
      ...current,
      ...toAdd.map((file) => ({ file, previewURL: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (index: number) => {
    setPicked((current) => {
      URL.revokeObjectURL(current[index].previewURL);
      return current.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (isSubmitting) return;
    if (!content.trim() && picked.length === 0) return;
    if (!draftIdRef.current) draftIdRef.current = crypto.randomUUID();

    const ok = await onSubmit(
      content,
      picked.map((item) => item.file),
      draftIdRef.current,
    );
    if (!ok) return;

    draftIdRef.current = null;
    setContent("");
    setPicked((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewURL));
      return [];
    });
  };

  const empty = !content.trim() && picked.length === 0;
  const nearLimit = content.length >= POST_CHAR_LIMIT * 0.9;

  return (
    <div className="space-y-4">
      <AuthorBadge
        linked={false}
        author={{
          id: profile.id,
          name: profile.displayName ?? "",
          tagLine: profile.tagLine,
          rankTier: profile.rankTier,
          isVerified: profile.isVerified,
          isPremium: profile.isPremium,
          avatarURL: profile.avatarURL,
        }}
      />

      <div className="relative">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={POST_CHAR_LIMIT}
          disabled={isSubmitting}
          placeholder={t("textareaPlaceholder")}
          className="cut-sm min-h-[7rem] w-full resize-none border border-border-med bg-bg-elevated px-3 pb-7 pt-2.5 font-body text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none"
        />
        <span
          className={`pointer-events-none absolute bottom-2 right-3 font-ui text-[11px] tabular-nums ${nearLimit ? "text-gold" : "text-text-3"}`}
        >
          {t("charCount", { current: content.length, max: POST_CHAR_LIMIT })}
        </span>
      </div>

      {picked.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {picked.map((item, index) => (
            <div key={item.previewURL} className="relative aspect-square">
              <img
                src={item.previewURL}
                alt=""
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={isSubmitting}
                aria-label={t("removeImage")}
                className="absolute right-1 top-1 flex size-6 items-center justify-center bg-bg-base/80 text-text-1 transition-colors hover:bg-val-red"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting || picked.length >= POST_IMAGE_LIMIT}
          className="cut-sm flex items-center gap-2 border border-border-med px-3 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:text-text-1 disabled:opacity-50"
        >
          <Icon name="ImageSquare" size={16} />
          {t("addImage")}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting || empty}
          className="cut-sm bg-val-red px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-[filter] hover:brightness-110 disabled:opacity-50"
        >
          {isSubmitting ? t("publishing") : t("publish")}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={addImages}
      />
    </div>
  );
}

export default function PostComposer({ onPosted }: PostComposerProps) {
  const t = useTranslations("communityBoard.composer");
  const {
    status,
    profile,
    profileStatus,
    canPost,
    refreshProfile,
    signInWithApple,
  } = useCommunitySession();
  const { createPost, isUploading } = useCreatePost();
  const [open, setOpen] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // 開著的期間一律用最後一份帳號資料：登出或帳號資料消失都不能把表單卸載——
  // 失敗的那一次要留著草稿與它的 id 給人重試，關閉是使用者自己的動作
  const [lastProfile, setLastProfile] = useState(profile);
  if (profile && lastProfile !== profile) setLastProfile(profile);
  const formProfile = open ? lastProfile : profile;

  // 上傳中不讓關：關掉會讓表單卸載，草稿與它的 id 一起消失
  const close = () => {
    if (!isUploading) setOpen(false);
  };

  // 成功之前不關：失敗時草稿還在表單裡，重按是同一篇（同一個 draftId）
  const submit = async (content: string, files: File[], draftId: string) => {
    const ok = await createPost(content, files, {
      postId: draftId,
      onSuccess: onPosted,
    });
    if (ok) setOpen(false);
    return ok;
  };

  const signedIn = status === "signedIn";
  const ready = (canPost || open) && Boolean(formProfile);

  // 未登入、帳號資料還在載、載入失敗、或登入了但還沒在 App 綁定 Riot ID
  let label = t("sharePrompt");
  let onClick = () => setOpen(true);
  if (!ready) {
    if (status === "loading") {
      label = t("loadingProfile");
      onClick = () => {};
    } else if (!signedIn) {
      label = t("loginToPost");
      onClick = () => void signInWithApple();
    } else if (profileStatus === "loading") {
      label = t("loadingProfile");
      onClick = () => {};
    } else if (profileStatus === "error") {
      label = t("profileLoadFailed");
      onClick = refreshProfile;
    } else {
      label = t("bindAccountFirst");
      onClick = () => setShowLinkDialog(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className="cut flex w-full items-center justify-between gap-4 border border-border-dim bg-bg-panel/40 px-4 py-3 text-left transition-colors hover:border-border-med"
      >
        <span className="font-body text-sm text-text-3">{label}</span>
        <span className="cut-sm border border-border-med px-3 py-1 font-ui text-xs font-bold uppercase tracking-widest text-val-red">
          {t("publish")}
        </span>
      </button>

      {formProfile && (
        <Portal>
          <HudModal open={open && ready} onClose={close} title={t("title")}>
            <ComposerForm
              profile={formProfile}
              isSubmitting={isUploading}
              onSubmit={submit}
            />
          </HudModal>
        </Portal>
      )}
      <LinkRiotIdDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
      />
    </div>
  );
}
