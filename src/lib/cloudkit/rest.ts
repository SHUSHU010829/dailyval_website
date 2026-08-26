// CloudKit Web Services 唯讀存取（伺服器端專用）。
// 走 API token 的匿名讀取，與 dailyval_social 的 server proxy 同一條路；
// 寫入一律由瀏覽器端 CloudKit JS 以登入者身分執行（PR 3），這裡不做。
//
// 注意：query 是 POST，Next 的 fetch cache 不會快取，快取一律放在
// 頁面／route handler 層（export const revalidate）。

import { CLOUDKIT_CONFIG, isCloudKitConfigured } from "@/lib/cloudkit/env";
import type { CKQueryRequest, CKRecord } from "@/lib/cloudkit/types";

/** CloudKit 單頁上限 200；drain 迴圈的頁數保險絲 */
const MAX_RESULTS_PER_PAGE = 200;
const MAX_DRAIN_PAGES = 25;

function assertServerOnly() {
  // API token 絕不能進到 client bundle
  if (typeof window !== "undefined") {
    throw new Error("cloudkit/rest.ts 僅限伺服器端使用");
  }
}

function databaseURL(operation: "query" | "lookup"): string {
  const { containerId, environment, apiToken } = CLOUDKIT_CONFIG;
  return (
    `https://api.apple-cloudkit.com/database/1/${containerId}/${environment}` +
    `/public/records/${operation}?ckAPIToken=${apiToken}`
  );
}

interface QueryPage {
  records: CKRecord[];
  continuationMarker: string | null;
}

/** 單頁查詢；設定缺漏或上游失敗回空頁（頁面退化，不丟例外） */
export async function queryRecords(
  query: CKQueryRequest,
  options?: { resultsLimit?: number; continuationMarker?: string | null }
): Promise<QueryPage> {
  assertServerOnly();
  if (!isCloudKitConfigured()) {
    return { records: [], continuationMarker: null };
  }

  const body: Record<string, unknown> = {
    query,
    resultsLimit: Math.min(options?.resultsLimit ?? MAX_RESULTS_PER_PAGE, MAX_RESULTS_PER_PAGE),
  };
  if (options?.continuationMarker) {
    body.continuationMarker = options.continuationMarker;
  }

  try {
    const res = await fetch(databaseURL("query"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[cloudkit] query ${query.recordType} 失敗：${res.status}`);
      return { records: [], continuationMarker: null };
    }
    const json = await res.json();
    return {
      records: Array.isArray(json?.records) ? (json.records as CKRecord[]) : [],
      continuationMarker: json?.continuationMarker ?? null,
    };
  } catch (error) {
    console.error("[cloudkit] query 網路錯誤", error);
    return { records: [], continuationMarker: null };
  }
}

/** 追完 continuationMarker 的完整查詢（iOS fetchAll 的對應） */
export async function queryAllRecords(query: CKQueryRequest): Promise<CKRecord[]> {
  const all: CKRecord[] = [];
  let marker: string | null = null;
  for (let page = 0; page < MAX_DRAIN_PAGES; page += 1) {
    const result: QueryPage = await queryRecords(query, { continuationMarker: marker });
    all.push(...result.records);
    if (!result.continuationMarker) return all;
    marker = result.continuationMarker;
  }
  console.error(`[cloudkit] query ${query.recordType} 超過 ${MAX_DRAIN_PAGES} 頁，結果可能不完整`);
  return all;
}
