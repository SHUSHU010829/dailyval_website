import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCreatePost } from "@/components/community/useCreatePost";
import { SocialServiceError } from "@/lib/community/errors";
import { createPost, postDetail } from "@/lib/community/service";
import { uploadImages } from "@/lib/community/media-upload";
import type { SocialPost } from "@/lib/community/types";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));
const { notify, mockSession } = vi.hoisted(() => ({
  notify: vi.fn(),
  mockSession: vi.fn(),
}));
vi.mock("@/components/community/CommunityNoticeProvider", () => ({
  useCommunityNotice: () => ({ notify }),
}));
vi.mock("@/components/community/CommunitySessionProvider", () => ({
  useCommunitySession: () => mockSession(),
}));
vi.mock("@/lib/community/service", () => ({
  createPost: vi.fn(),
  postDetail: vi.fn(),
}));
vi.mock("@/lib/community/media-upload", () => ({ uploadImages: vi.fn() }));
vi.mock("@/lib/community/image-compress", () => ({
  prepareImage: vi.fn(async () => ({
    original: new Blob(["x"]),
    thumbnail: new Blob(["y"]),
    width: 1,
    height: 1,
    previewURL: "blob:p",
  })),
}));

const UID = "e37c1ec9-1f0a-526f-97e0-439716f5ee09";
const POST_ID = "f17c6a79-3183-59ac-a7fe-59b693f0e624";
const published: SocialPost = {
  id: POST_ID,
  body: "hello",
  createdAt: "now",
  likeCount: 0,
  dislikeCount: 0,
  commentCount: 0,
  author: {
    id: UID,
    name: "me",
    tagLine: null,
    rankTier: null,
    isVerified: false,
    isPremium: false,
    avatarURL: null,
  },
  images: [],
  myReaction: null,
  didReport: false,
};

describe("components/community/useCreatePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockReturnValue({ uid: UID, canPost: true });
    global.URL.revokeObjectURL = vi.fn();
  });

  it("uploads, creates with the draft id, then reads the row back", async () => {
    vi.mocked(uploadImages).mockResolvedValue([]);
    vi.mocked(createPost).mockResolvedValue(POST_ID);
    vi.mocked(postDetail).mockResolvedValue(published);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePost());

    let ok = false;
    await act(async () => {
      ok = await result.current.createPost("hello", [], {
        postId: POST_ID,
        onSuccess,
      });
    });

    expect(ok).toBe(true);
    expect(createPost).toHaveBeenCalledWith({
      id: POST_ID,
      body: "hello",
      images: [],
      expectedUid: UID,
    });
    expect(onSuccess).toHaveBeenCalledWith(published);
  });

  it('treats target_exists on retry as "already published" when the post is ours', async () => {
    vi.mocked(uploadImages).mockRejectedValue(
      new SocialServiceError("invalid_image", "target_exists"),
    );
    vi.mocked(postDetail).mockResolvedValue(published);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePost());

    let ok = false;
    await act(async () => {
      ok = await result.current.createPost(
        "hello",
        [new File(["x"], "a.jpg")],
        { postId: POST_ID, onSuccess },
      );
    });

    expect(ok).toBe(true);
    expect(createPost).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(published);
  });

  it("treats a post that exists but is no longer visible as published, and clears the draft", async () => {
    vi.mocked(uploadImages).mockRejectedValue(
      new SocialServiceError("invalid_image", "target_exists"),
    );
    vi.mocked(postDetail).mockResolvedValue(null);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePost());

    let ok = false;
    await act(async () => {
      ok = await result.current.createPost(
        "hello",
        [new File(["x"], "a.jpg")],
        { postId: POST_ID, onSuccess },
      );
    });
    expect(ok).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    // 純文字：create_post 的冪等出口回了 id，讀回卻是空的（被下架）
    vi.mocked(uploadImages).mockResolvedValue([]);
    vi.mocked(createPost).mockResolvedValue(POST_ID);
    await act(async () => {
      ok = await result.current.createPost("hello", [], {
        postId: POST_ID,
        onSuccess,
      });
    });
    expect(ok).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not claim someone else’s post with the same id", async () => {
    vi.mocked(uploadImages).mockRejectedValue(
      new SocialServiceError("invalid_image", "target_exists"),
    );
    vi.mocked(postDetail).mockResolvedValue({
      ...published,
      author: { ...published.author, id: "other" },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePost());

    let ok = true;
    await act(async () => {
      ok = await result.current.createPost(
        "hello",
        [new File(["x"], "a.jpg")],
        { postId: POST_ID, onSuccess },
      );
    });

    expect(ok).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(createPost).not.toHaveBeenCalled();
  });

  it("returns false and keeps the draft when the server refuses", async () => {
    vi.mocked(uploadImages).mockResolvedValue([]);
    vi.mocked(createPost).mockRejectedValue(
      new SocialServiceError("rate_limited"),
    );
    const { result } = renderHook(() => useCreatePost());

    let ok = true;
    await act(async () => {
      ok = await result.current.createPost("hello", [], { postId: POST_ID });
    });
    expect(ok).toBe(false);
  });

  it("tells a signed-out viewer to sign in, not to link the app", async () => {
    mockSession.mockReturnValue({ uid: null, canPost: false });
    const { result } = renderHook(() => useCreatePost());
    let ok = true;
    await act(async () => {
      ok = await result.current.createPost("hello", [], { postId: POST_ID });
    });
    expect(ok).toBe(false);
    expect(notify).toHaveBeenCalledWith(
      "error",
      "communityBoard.errors.notSignedIn",
    );
  });

  it("refuses without a byline", async () => {
    mockSession.mockReturnValue({ uid: UID, canPost: false });
    const { result } = renderHook(() => useCreatePost());
    let ok = true;
    await act(async () => {
      ok = await result.current.createPost("hello", [], { postId: POST_ID });
    });
    expect(ok).toBe(false);
    expect(uploadImages).not.toHaveBeenCalled();
  });
});
