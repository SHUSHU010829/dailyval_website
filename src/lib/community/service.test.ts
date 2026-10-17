// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => ({ schema: () => ({ rpc: mockRpc }) }),
}));

import {
  blockAuthor,
  commentsPage,
  createComment,
  createPost,
  feedPage,
  reportContent,
  setCommentReaction,
  setPostReaction,
} from "@/lib/community/service";
import { SocialServiceError } from "@/lib/community/errors";

const UID = "e37c1ec9-1f0a-526f-97e0-439716f5ee09";
const POST = "f17c6a79-3183-59ac-a7fe-59b693f0e624";

describe("lib/community/service", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("sends optional arguments as explicit JSON null, never omits them", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await feedPage(null);
    expect(mockRpc).toHaveBeenCalledWith("feed", {
      p_before: null,
      p_before_id: null,
      p_limit: 20,
    });

    await commentsPage(POST, null);
    expect(mockRpc).toHaveBeenCalledWith("post_comments", {
      p_post_id: POST,
      p_after: null,
      p_after_id: null,
      p_limit: 50,
    });

    mockRpc.mockResolvedValue({ data: null, error: null });
    await reportContent("post", POST, UID);
    expect(mockRpc).toHaveBeenCalledWith("report_content", {
      p_kind: "post",
      p_target_id: POST,
      p_reason: null,
      p_expected_uid: UID,
    });

    mockRpc.mockResolvedValue({ data: "c1", error: null });
    await createComment({
      id: "c1",
      postId: POST,
      body: "hi",
      ticketId: null,
      expectedUid: UID,
    });
    expect(mockRpc).toHaveBeenCalledWith("create_comment", {
      p_comment_id: "c1",
      p_post_id: POST,
      p_body: "hi",
      p_ticket_id: null,
      p_expected_uid: UID,
    });
    // 每一個 key 都在，沒有 undefined
    for (const call of mockRpc.mock.calls) {
      for (const value of Object.values(call[1] as Record<string, unknown>)) {
        expect(value).not.toBeUndefined();
      }
    }
  });

  it("clears a reaction with p_kind null and returns the server counts", async () => {
    mockRpc.mockResolvedValue({
      data: [{ like_count: 7, dislike_count: 1, my_kind: null }],
      error: null,
    });
    const state = await setPostReaction(POST, null, UID);
    expect(mockRpc).toHaveBeenCalledWith("set_post_reaction", {
      p_post_id: POST,
      p_kind: null,
      p_expected_uid: UID,
    });
    expect(state).toEqual({ likeCount: 7, dislikeCount: 1, mine: null });

    mockRpc.mockResolvedValue({
      data: [{ like_count: 3, my_kind: "like" }],
      error: null,
    });
    expect(await setCommentReaction("c1", "like", UID)).toEqual({
      likeCount: 3,
      mine: "like",
    });
  });

  it("attaches images by ticket, not by key", async () => {
    mockRpc.mockResolvedValue({ data: POST, error: null });
    await createPost({
      id: POST,
      body: "x",
      expectedUid: UID,
      images: [
        {
          position: 0,
          ticketId: "t0",
          objectKey: "posts/p/0.jpg",
          thumbKey: "posts/p/0_thumb.jpg",
          width: 10,
          height: 20,
          url: "u",
          thumbURL: "tu",
        },
      ],
    });
    expect(mockRpc).toHaveBeenCalledWith("create_post", {
      p_post_id: POST,
      p_body: "x",
      p_images: [{ ticket: "t0", width: 10, height: 20 }],
      p_expected_uid: UID,
    });
  });

  it("names the content, not the person, when blocking", async () => {
    mockRpc.mockResolvedValue({ data: "b1", error: null });
    expect(await blockAuthor("comment", "c1", UID)).toBe("b1");
    expect(mockRpc).toHaveBeenCalledWith("block_author", {
      p_kind: "comment",
      p_target_id: "c1",
      p_expected_uid: UID,
    });
  });

  it("classifies server errors", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rate_limited", code: "P0001" },
    });
    await expect(reportContent("post", POST, UID)).rejects.toMatchObject({
      kind: "rate_limited",
    });

    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(setPostReaction(POST, "like", UID)).rejects.toBeInstanceOf(
      SocialServiceError,
    );
  });
});
