// 造型評分的伺服器端讀取（組合 cloudkit/rest + decode + aggregate）。
// 全部匿名唯讀。CloudKit query 是 POST，進不了 Next 的 fetch cache，
// 所以在這層用 unstable_cache 包（排行榜 300s、單造型 60s），
// 頁面就算被 dynamic render 也不會每個 request 都打 CloudKit。

import { unstable_cache } from "next/cache";
import { queryAllRecords, queryRecords } from "@/lib/cloudkit/rest";
import { decodeSkinAggregate, decodeSkinComment } from "@/lib/cloudkit/decode";
import { mergeAggregates, type MergedAggregate } from "@/lib/ratings/aggregate";
import type { AggregateTotals } from "@/lib/ratings/leaderboard";
import type { SkinCommentData } from "@/lib/cloudkit/types";

/** iOS 留言查詢同樣以 100 筆為上限 */
const COMMENTS_LIMIT = 100;

const cachedAllAggregates = unstable_cache(
  async (): Promise<Record<string, AggregateTotals>> => {
    // 注意 Skin/Rating 沒開排序索引，不能帶 sortBy（iOS 同樣避開）
    const records = await queryAllRecords({
      recordType: "Skin",
      filterBy: [
        { fieldName: "ratingCount", comparator: "GREATER_THAN", fieldValue: { value: 0 } },
      ],
    });

    const totals: Record<string, AggregateTotals> = {};
    for (const record of records) {
      const aggregate = decodeSkinAggregate(record);
      if (!aggregate) continue;
      const existing = totals[aggregate.skinID];
      totals[aggregate.skinID] = {
        ratingCount: (existing?.ratingCount ?? 0) + aggregate.ratingCount,
        ratingSum: (existing?.ratingSum ?? 0) + aggregate.ratingSum,
      };
    }
    return totals;
  },
  ["skin-aggregates-all"],
  { revalidate: 300 }
);

/**
 * 排行榜用：所有有票數的彙總，依 skinID 合併重複 record（加總）。
 */
export async function fetchAllSkinAggregates(): Promise<Map<string, AggregateTotals>> {
  return new Map(Object.entries(await cachedAllAggregates()));
}

const cachedSkinAggregate = unstable_cache(
  async (skinID: string): Promise<MergedAggregate> => {
    const records = await queryAllRecords({
      recordType: "Skin",
      filterBy: [
        { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
      ],
    });
    return mergeAggregates(
      records
        .map(decodeSkinAggregate)
        .filter((aggregate): aggregate is NonNullable<typeof aggregate> => aggregate !== null)
    );
  },
  ["skin-aggregate"],
  { revalidate: 60 }
);

/** 單一造型的彙總（重複 record 加總；writeTarget 給之後的寫入路徑用） */
export async function fetchSkinAggregate(skinID: string): Promise<MergedAggregate> {
  return cachedSkinAggregate(skinID);
}

const cachedSkinComments = unstable_cache(
  async (skinID: string): Promise<SkinCommentData[]> => {
    // SkinComment 有建立時間索引，可伺服器排序（最新在前）
    const { records } = await queryRecords(
      {
        recordType: "SkinComment",
        filterBy: [
          { fieldName: "skinID", comparator: "EQUALS", fieldValue: { value: skinID } },
        ],
        sortBy: [{ fieldName: "___createTime", ascending: false }],
      },
      { resultsLimit: COMMENTS_LIMIT }
    );
    return records
      .map(decodeSkinComment)
      .filter((comment): comment is SkinCommentData => comment !== null);
  },
  ["skin-comments"],
  { revalidate: 60 }
);

/** 單一造型的留言，最新在前 */
export async function fetchSkinComments(skinID: string): Promise<SkinCommentData[]> {
  return cachedSkinComments(skinID);
}
