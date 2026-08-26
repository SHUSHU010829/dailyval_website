import { describe, expect, it } from "vitest";
import { decodeSkinAggregate, decodeSkinComment } from "./decode";
import type { CKRecord } from "./types";

const validComment: CKRecord = {
  recordName: "comment-1",
  recordType: "SkinComment",
  created: { timestamp: 1724000000000 },
  fields: {
    skinID: { value: "aaaa-bbbb" },
    text: { value: "great skin" },
    likedUserIDs: { value: ["user-1", "user-2"] },
    userID: { value: "riot-puuid" },
    userName: { value: "Kris" },
    tagLine: { value: "0404" },
    userImage: { value: "https://example.com/card.png" },
    rankTier: { value: 21 },
    isVerify: { value: 1 },
    isPremium: { value: 0 },
  },
};

describe("decodeSkinComment", () => {
  it("完整 record 正常解碼；布林欄位是 INT64 0/1", () => {
    const comment = decodeSkinComment(validComment);
    expect(comment).toMatchObject({
      id: "comment-1",
      skinID: "aaaa-bbbb",
      text: "great skin",
      likedUserIDs: ["user-1", "user-2"],
      userID: "riot-puuid",
      userName: "Kris",
      tagLine: "0404",
      rankTier: 21,
      isVerify: true,
      isPremium: false,
      createdAt: 1724000000000,
    });
  });

  it("語意欄位缺一整筆丟棄（與 iOS from(record:) 一致，避免兩端顯示不一致）", () => {
    for (const field of ["skinID", "text", "userID", "userName", "tagLine", "userImage", "rankTier"]) {
      const record: CKRecord = {
        ...validComment,
        fields: { ...validComment.fields, [field]: undefined },
      };
      expect(decodeSkinComment(record), `missing ${field}`).toBeNull();
    }
  });

  it("缺建立時間整筆丟棄", () => {
    expect(decodeSkinComment({ ...validComment, created: {} })).toBeNull();
  });

  it("likedUserIDs 缺席視為零讚（wire 上空陣列可能整個欄位消失），不丟棄留言", () => {
    const record: CKRecord = {
      ...validComment,
      fields: { ...validComment.fields, likedUserIDs: undefined },
    };
    expect(decodeSkinComment(record)?.likedUserIDs).toEqual([]);
  });

  it("isVerify / isPremium 選填，缺席為 null", () => {
    const record: CKRecord = {
      ...validComment,
      fields: { ...validComment.fields, isVerify: undefined, isPremium: undefined },
    };
    const comment = decodeSkinComment(record);
    expect(comment?.isVerify).toBeNull();
    expect(comment?.isPremium).toBeNull();
  });
});

describe("decodeSkinAggregate", () => {
  it("正常解碼並保留 recordChangeTag 與建立時間（CAS 與寫入目標選擇要用）", () => {
    const aggregate = decodeSkinAggregate({
      recordName: "skin-aaaa",
      recordChangeTag: "tag-1",
      created: { timestamp: 111 },
      fields: {
        skinID: { value: "aaaa" },
        ratingCount: { value: 244 },
        ratingSum: { value: 1000 },
      },
    });
    expect(aggregate).toEqual({
      recordName: "skin-aaaa",
      recordChangeTag: "tag-1",
      skinID: "aaaa",
      ratingCount: 244,
      ratingSum: 1000,
      createdAt: 111,
    });
  });

  it("欄位缺漏或型別不對回 null", () => {
    expect(
      decodeSkinAggregate({
        recordName: "skin-aaaa",
        fields: { skinID: { value: "aaaa" }, ratingCount: { value: "244" } },
      })
    ).toBeNull();
  });
});
