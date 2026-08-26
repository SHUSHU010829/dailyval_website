// 瀏覽器端 CloudKit JS 的載入與薄封裝。
// 寫入一律走這裡（以登入者身分寫，userReference 才會對上 iOS 的
// 同一個 CloudKit 使用者），伺服器端的 API token 只做匿名讀取。
// 參考實作：dailyval_social components/cloudkit-authentication.tsx。

const CLOUDKIT_JS_SRC = "https://cdn.apple-cloudkit.com/ck/2/cloudkit.js";

/** CloudKit JS 的 record 形狀（fields 值是 {value}；saveRecords 會自動帶 recordChangeTag 做 CAS） */
export interface CKJSRecord {
  recordType: string;
  recordName?: string;
  recordChangeTag?: string;
  created?: { timestamp?: number };
  fields: Record<string, { value: unknown; type?: string } | undefined>;
}

interface CKJSResponse {
  hasErrors: boolean;
  errors?: Array<{ serverErrorCode?: string; reason?: string }>;
  records: CKJSRecord[];
  moreComing?: boolean;
  continuationMarker?: string;
}

interface CKJSQuery {
  recordType: string;
  filterBy?: Array<{
    fieldName: string;
    comparator: string;
    fieldValue: { value: unknown; type?: string };
  }>;
  sortBy?: Array<{ fieldName: string; ascending: boolean }>;
}

interface CKJSDatabase {
  performQuery(
    query: CKJSQuery,
    options?: { resultsLimit?: number; continuationMarker?: string }
  ): Promise<CKJSResponse>;
  fetchRecords(recordNames: string[]): Promise<CKJSResponse>;
  saveRecords(records: CKJSRecord[]): Promise<CKJSResponse>;
  deleteRecords(recordNames: string[]): Promise<CKJSResponse>;
}

export interface CKJSUserIdentity {
  userRecordName: string;
}

interface CKJSContainer {
  publicCloudDatabase: CKJSDatabase;
  setUpAuth(): Promise<CKJSUserIdentity | null>;
  whenUserSignsIn(): Promise<CKJSUserIdentity>;
  whenUserSignsOut(): Promise<void>;
}

interface CloudKitGlobal {
  configure(config: unknown): void;
  getDefaultContainer(): CKJSContainer;
}

declare global {
  interface Window {
    CloudKit?: CloudKitGlobal;
  }
}

let loadPromise: Promise<CloudKitGlobal> | null = null;

/** 注入 cloudkit.js（一次）並等它就緒 */
export function loadCloudKitJS(): Promise<CloudKitGlobal> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.CloudKit) {
      resolve(window.CloudKit);
      return;
    }
    const script = document.createElement("script");
    script.src = CLOUDKIT_JS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.CloudKit) resolve(window.CloudKit);
      else reject(new Error("cloudkit.js 載入後 window.CloudKit 不存在"));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("cloudkit.js 載入失敗"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

let configuredContainer: CKJSContainer | null = null;

/** 抓 /api/cloudkit-config、configure、回傳預設 container（可重複呼叫） */
export async function getCloudKitContainer(): Promise<CKJSContainer> {
  if (configuredContainer) return configuredContainer;

  const [cloudKit, configRes] = await Promise.all([
    loadCloudKitJS(),
    fetch("/api/cloudkit-config"),
  ]);
  if (!configRes.ok) throw new Error("CloudKit 尚未設定（/api/cloudkit-config）");
  const config = await configRes.json();

  cloudKit.configure({
    containers: [
      {
        containerIdentifier: config.containerId,
        apiTokenAuth: {
          apiToken: config.apiToken,
          persist: true,
          signInButton: { id: "apple-sign-in-button", theme: "black" },
          signOutButton: { id: "apple-sign-out-button", theme: "black" },
        },
        environment: config.environment,
      },
    ],
  });

  configuredContainer = cloudKit.getDefaultContainer();
  return configuredContainer;
}

export function getPublicDatabase(): CKJSDatabase {
  if (!configuredContainer) throw new Error("CloudKit 尚未初始化");
  return configuredContainer.publicCloudDatabase;
}

/**
 * 追完 continuationMarker 的查詢。
 * 頁數保險絲「到頂就丟例外」，絕不默默回傳半套結果——重數這種
 * 破壞性寫入把不完整的清單當完整用，會永久抹掉超出上限的票。
 */
export async function queryAllCKJS(
  query: CKJSQuery,
  options?: { resultsLimit?: number; maxPages?: number }
): Promise<CKJSRecord[]> {
  const database = getPublicDatabase();
  const resultsLimit = options?.resultsLimit ?? 200;
  const maxPages = options?.maxPages ?? 25;
  const all: CKJSRecord[] = [];
  let marker: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await database.performQuery(query, {
      resultsLimit,
      continuationMarker: marker,
    });
    if (response.hasErrors) {
      throw new Error(response.errors?.[0]?.reason ?? "CloudKit 查詢失敗");
    }
    all.push(...response.records);
    if (!response.moreComing || !response.continuationMarker) return all;
    marker = response.continuationMarker;
  }
  throw new Error(
    `CloudKit 查詢 ${query.recordType} 超過 ${maxPages} 頁上限，結果不完整`
  );
}
