import { describe, expect, it } from "vitest";
import {
  BadInput,
  badgeQueueParams,
  badgeSort,
  bool,
  oneOf,
  optionalTimestamp,
  reason,
  reportQueueParams,
  reportSort,
  timestamp,
  targetKind,
  targetKinds,
  uuid,
} from "./validate";

describe("uuid", () => {
  it("accepts a uuid and lowercases it", () => {
    expect(uuid("0A0A0A0A-0000-0000-0000-00000000000A", "id")).toBe(
      "0a0a0a0a-0000-0000-0000-00000000000a"
    );
  });

  it("rejects anything that is not one", () => {
    // 這些會被原封送進 rpc 的參數位置。擋在這裡是為了少一次往返，
    // 不是唯一的防線——資料庫那一側的型別才是。
    for (const bad of ["", "1", "not-a-uuid", null, undefined, 42, {}]) {
      expect(() => uuid(bad, "id")).toThrow(BadInput);
    }
  });
});

describe("reason", () => {
  it("is optional when the action is reversible", () => {
    expect(reason(undefined, { required: false })).toBeNull();
    expect(reason("   ", { required: false })).toBeNull();
  });

  it("is mandatory when it is not", () => {
    // 刪除與封禁都不可逆，所以空白理由要在按下去之前就被擋掉。
    expect(() => reason(undefined, { required: true })).toThrow(BadInput);
    expect(() => reason("   ", { required: true })).toThrow(BadInput);
  });

  it("trims and caps length", () => {
    expect(reason("  spam  ", { required: true })).toBe("spam");
    expect(() => reason("x".repeat(501), { required: true })).toThrow(BadInput);
  });
});

describe("optionalTimestamp", () => {
  it("treats absent as a permanent ban rather than an error", () => {
    expect(optionalTimestamp(undefined, "expires_at")).toBeNull();
    expect(optionalTimestamp("", "expires_at")).toBeNull();
  });

  it("refuses a date in the past", () => {
    // 一個已經過期的封禁在寫入的當下就失效了，看起來像「封了但沒效」。
    expect(() => optionalTimestamp("2000-01-01T00:00:00Z", "expires_at")).toThrow(BadInput);
  });

  it("normalises a future date to ISO", () => {
    const later = new Date(Date.now() + 86_400_000).toISOString();
    expect(optionalTimestamp(later, "expires_at")).toBe(later);
  });

  it("refuses nonsense", () => {
    expect(() => optionalTimestamp("next tuesday", "expires_at")).toThrow(BadInput);
  });
});

describe("the small ones", () => {
  it("targetKind allows every social.target_kind value and passes it through unchanged", () => {
    for (const kind of ["post", "comment", "room", "skin_comment", "esports_comment"]) {
      expect(targetKind(kind)).toBe(kind);
    }
  });

  it("targetKind refuses anything outside the enum", () => {
    // 送錯種類的代價不是一個錯誤訊息，是處置打到另一張表上同一個 id 的東西。
    for (const bad of ["user", "Skin_Comment", "skin-comment", "esports", "", null, undefined, 1]) {
      expect(() => targetKind(bad)).toThrow(BadInput);
    }
  });

  it("bool does not coerce", () => {
    // "false" 是 truthy。強制轉型會讓「恢復」變成「下架」。
    expect(() => bool("false", "hidden")).toThrow(BadInput);
    expect(bool(false, "hidden")).toBe(false);
  });

  it("oneOf rejects values outside the list", () => {
    expect(oneOf("ban", ["ban", "lift"] as const, "action")).toBe("ban");
    expect(() => oneOf("delete", ["ban", "lift"] as const, "action")).toThrow(BadInput);
  });
});

describe("reportSort", () => {
  it("defaults to the original most-reports order when absent", () => {
    expect(reportSort(null)).toBe("most");
    expect(reportSort("")).toBe("most");
  });

  it("accepts the three orders the rpc knows", () => {
    for (const sort of ["most", "newest", "oldest"]) expect(reportSort(sort)).toBe(sort);
  });

  it("refuses anything else instead of quietly falling back", () => {
    // 默默退回預設的話，畫面上寫著「最舊檢舉」，排出來的卻是「檢舉最多」。
    for (const bad of ["Newest", "latest", "most,newest", " oldest"]) {
      expect(() => reportSort(bad)).toThrow(BadInput);
    }
  });
});

describe("targetKinds", () => {
  it("treats absent or empty as every kind", () => {
    expect(targetKinds(null)).toBeNull();
    expect(targetKinds("")).toBeNull();
  });

  it("parses one kind or several", () => {
    expect(targetKinds("skin_comment")).toEqual(["skin_comment"]);
    expect(targetKinds("post,esports_comment")).toEqual(["post", "esports_comment"]);
  });

  it("drops duplicates and returns the canonical order", () => {
    expect(targetKinds("room,post,room,post")).toEqual(["post", "room"]);
  });

  it("refuses an unknown kind or an empty entry", () => {
    // 略過打錯的種類，畫面就會說「這種沒有檢舉」，而那不是真的。
    for (const bad of ["user", "post,user", "post,", ",post", "post,,comment", "Post", "post, comment"]) {
      expect(() => targetKinds(bad)).toThrow(BadInput);
    }
  });
});

describe("reportQueueParams", () => {
  const params = (query: string) =>
    reportQueueParams(new URL(`https://dailyval.com/api/admin/reports?${query}`));

  it("keeps the old defaults when nothing new is sent", () => {
    expect(params("")).toEqual({ p_status: "open", p_sort: "most", p_limit: 50, p_offset: 0 });
  });

  it("omits p_kinds entirely for all kinds so the rpc default applies", () => {
    expect(params("kinds=")).not.toHaveProperty("p_kinds");
    expect(params("status=open")).not.toHaveProperty("p_kinds");
  });

  it("maps every parameter onto the rpc arguments", () => {
    expect(params("status=all&sort=oldest&kinds=skin_comment,skin_comment&offset=50")).toEqual({
      p_status: null,
      p_sort: "oldest",
      p_kinds: ["skin_comment"],
      p_limit: 50,
      p_offset: 50,
    });
  });

  it("refuses a bad status, sort or kind", () => {
    for (const bad of ["status=closed", "status=", "sort=random", "kinds=story"]) {
      expect(() => params(bad)).toThrow(BadInput);
    }
  });
});

describe("badgeSort", () => {
  it("defaults to the original oldest-first order when absent", () => {
    expect(badgeSort(null)).toBe("oldest");
    expect(badgeSort("")).toBe("oldest");
  });

  it("accepts the two orders the rpc knows", () => {
    for (const sort of ["oldest", "newest"]) expect(badgeSort(sort)).toBe(sort);
  });

  it("refuses anything else instead of quietly falling back", () => {
    // 默默退回預設的話，畫面上寫著「最新申請」，排出來的卻是最舊的先。
    for (const bad of ["Newest", "latest", "most", " newest"]) {
      expect(() => badgeSort(bad)).toThrow(BadInput);
    }
  });
});

describe("badgeQueueParams", () => {
  const params = (query: string) =>
    badgeQueueParams(new URL(`https://dailyval.com/api/admin/badges?${query}`));

  it("sends exactly what the old console sent when nothing new is picked", () => {
    // 預設不帶 p_sort：資料庫還沒更新的話，舊的四參數函式照樣接得住。
    expect(params("")).toEqual({ p_status: "pending", p_limit: 50, p_offset: 0 });
    expect(params("sort=oldest")).not.toHaveProperty("p_sort");
  });

  it("maps every parameter onto the rpc arguments", () => {
    expect(
      params("status=all&sort=newest&offset=50&as_of=2026-10-01T13%3A23%3A36.934821%2B00%3A00")
    ).toEqual({
      p_status: null,
      p_sort: "newest",
      p_as_of: "2026-10-01T13:23:36.934821+00:00",
      p_limit: 50,
      p_offset: 50,
    });
  });

  it("passes a cursor through as a pair", () => {
    expect(
      params(
        "sort=newest&after_at=2026-09-01T04%3A00%3A00.000001%2B00%3A00&after_id=0A0A0A0A-0000-4000-8000-00000000000A"
      )
    ).toEqual({
      p_status: "pending",
      p_sort: "newest",
      p_after_at: "2026-09-01T04:00:00.000001+00:00",
      p_after_id: "0a0a0a0a-0000-4000-8000-00000000000a",
      p_limit: 50,
      p_offset: 0,
    });
  });

  it("refuses a bad status, sort, snapshot or cursor", () => {
    for (const bad of [
      "status=open",
      "status=",
      "sort=most",
      "sort=random",
      "as_of=yesterday",
      "as_of=2026-02-30T00%3A00%3A00Z",
      "after_at=2026-09-01T00%3A00%3A00Z",
      "after_id=0a0a0a0a-0000-4000-8000-00000000000a",
      "after_at=2026-09-01T00%3A00%3A00Z&after_id=nope",
    ]) {
      expect(() => params(bad), bad).toThrow(BadInput);
    }
  });
});

describe("timestamp", () => {
  it("treats absent or empty as not given", () => {
    expect(timestamp(null, "as_of")).toBeUndefined();
    expect(timestamp("", "as_of")).toBeUndefined();
  });

  it("passes the database's string through untouched, microseconds included", () => {
    // 經過 Date 會截成毫秒，游標就停在錯的位置。
    for (const t of [
      "2026-10-01T13:23:36.934821+00:00",
      "2026-10-01T13:23:36Z",
      "2026-10-01T21:23:36.5+08:00",
      "2024-02-29T00:00:00Z",
      "2026-12-31T23:59:59.999999-05:00",
    ]) {
      expect(timestamp(t, "as_of")).toBe(t);
    }
  });

  it("refuses anything that is not a real, full timestamp", () => {
    for (const bad of [
      "2026-10-01",
      "2026-10-01 13:23:36+00",
      "2026-10-01T13:23:36",
      "2026-13-01T00:00:00Z",
      "2026-02-30T00:00:00Z",
      "2025-02-29T00:00:00Z",
      "2026-04-31T00:00:00Z",
      "2026-10-00T00:00:00Z",
      "2026-10-01T24:00:00Z",
      "2026-10-01T13:60:00Z",
      "2026-10-01T13:23:60Z",
      "2026-10-01T13:23:36+16:00",
      "2026-10-01T13:23:36.1234567Z",
      "now",
    ]) {
      expect(() => timestamp(bad, "as_of"), bad).toThrow(BadInput);
    }
  });
});
