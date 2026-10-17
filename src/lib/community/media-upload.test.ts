// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => ({ functions: { invoke: mockInvoke } }),
}));

vi.mock("@supabase/supabase-js", () => {
  class FunctionsHttpError extends Error {
    context: { status: number; json: () => Promise<unknown> };
    constructor(context: { status: number; json: () => Promise<unknown> }) {
      super("http error");
      this.context = context;
    }
  }
  return { FunctionsHttpError };
});

import { FunctionsHttpError } from "@supabase/supabase-js";
import { uploadImages } from "@/lib/community/media-upload";
import type { PreparedImage } from "@/lib/community/image-compress";

const UID = "e37c1ec9-1f0a-526f-97e0-439716f5ee09";
const POST = "f17c6a79-3183-59ac-a7fe-59b693f0e624";

function prepared(size: number): PreparedImage {
  return {
    original: new Blob([new Uint8Array(size)], { type: "image/jpeg" }),
    thumbnail: new Blob([new Uint8Array(Math.floor(size / 4))], {
      type: "image/jpeg",
    }),
    width: 100,
    height: 50,
    previewURL: "blob:preview",
  };
}

function ticketResponse(id: string) {
  return {
    data: {
      ticket_id: id,
      upload: {
        url: `https://r2/${id}`,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": "999",
          "Cache-Control": "x",
        },
      },
      thumb_upload: {
        url: `https://r2/${id}_thumb`,
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "x" },
      },
    },
    error: null,
  };
}

describe("lib/community/media-upload", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("asks for a ticket, PUTs both renditions to the staging URLs, then promotes exactly those tickets", async () => {
    const puts: Array<{ url: string; headers: Record<string, string> }> = [];
    global.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init: RequestInit) => {
        puts.push({ url, headers: init.headers as Record<string, string> });
        return { ok: true, status: 200 };
      }) as unknown as typeof fetch;

    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: Record<string, unknown> }) => {
        if (body.action === "ticket")
          return ticketResponse(`t${body.position}`);
        return {
          data: {
            images: [
              {
                position: 0,
                object_key: "k0",
                thumb_key: "k0t",
                url: "u0",
                thumb_url: "ut0",
              },
              {
                position: 1,
                object_key: "k1",
                thumb_key: "k1t",
                url: "u1",
                thumb_url: "ut1",
              },
            ],
          },
          error: null,
        };
      },
    );

    const uploaded = await uploadImages([prepared(1000), prepared(2000)], {
      scope: "post",
      targetId: POST,
      expectedUid: UID,
    });

    const ticketCalls = mockInvoke.mock.calls.filter(
      (call) => call[1].body.action === "ticket",
    );
    expect(ticketCalls).toHaveLength(2);
    expect(ticketCalls[0][1].body).toMatchObject({
      expected_uid: UID,
      scope: "post",
      target_id: POST,
      position: 0,
      content_type: "image/jpeg",
      bytes: 1000,
      thumb_bytes: 250,
    });

    // 原圖與縮圖都 PUT 了；Content-Length 交給瀏覽器，其餘簽過的標頭原樣送
    expect(puts.map((put) => put.url).sort()).toEqual([
      "https://r2/t0",
      "https://r2/t0_thumb",
      "https://r2/t1",
      "https://r2/t1_thumb",
    ]);
    expect(puts[0].headers["Content-Length"]).toBeUndefined();
    expect(puts[0].headers["Cache-Control"]).toBe("x");

    const promote = mockInvoke.mock.calls.find(
      (call) => call[1].body.action === "promote",
    );
    expect(promote?.[1].body).toEqual({
      action: "promote",
      expected_uid: UID,
      scope: "post",
      target_id: POST,
      ticket_ids: ["t0", "t1"],
    });

    expect(uploaded.map((image) => image.ticketId)).toEqual(["t0", "t1"]);
    expect(uploaded[1]).toMatchObject({
      position: 1,
      objectKey: "k1",
      width: 100,
      height: 50,
    });
  });

  it("fails the whole batch when a PUT is refused, and never promotes", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
    mockInvoke.mockResolvedValue(ticketResponse("t0"));

    await expect(
      uploadImages([prepared(10)], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "invalid_image" });
    expect(
      mockInvoke.mock.calls.every((call) => call[1].body.action === "ticket"),
    ).toBe(true);
  });

  it("fails when the server promoted fewer images than were staged", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: Record<string, unknown> }) => {
        if (body.action === "ticket")
          return ticketResponse(`t${body.position}`);
        return { data: { images: [] }, error: null };
      },
    );

    await expect(
      uploadImages([prepared(10)], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "invalid_image" });
  });

  it("translates the function’s error codes", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        status: 403,
        json: async () => ({ error: "user_banned" }),
      }),
    });
    await expect(
      uploadImages([prepared(10)], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "banned" });
  });

  it("treats a failed promotion and a store outage as retryable, not as a bad image", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
    mockInvoke.mockImplementation(
      async (_name: string, { body }: { body: Record<string, unknown> }) => {
        if (body.action === "ticket")
          return ticketResponse(`t${body.position}`);
        return {
          data: null,
          error: new FunctionsHttpError({
            status: 502,
            json: async () => ({ error: "promote_failed" }),
          }),
        };
      },
    );
    await expect(
      uploadImages([prepared(10)], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "network" });

    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    mockInvoke.mockResolvedValue(ticketResponse("t0"));
    await expect(
      uploadImages([prepared(10)], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "network" });
  });

  it("refuses more images than the scope allows before touching the network", async () => {
    await expect(
      uploadImages([prepared(1), prepared(1)], {
        scope: "comment",
        targetId: POST,
        expectedUid: UID,
      }),
    ).rejects.toMatchObject({ kind: "too_many_images" });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns nothing to do for an empty batch", async () => {
    expect(
      await uploadImages([], {
        scope: "post",
        targetId: POST,
        expectedUid: UID,
      }),
    ).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
