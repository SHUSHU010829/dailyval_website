// 文章圖片直接從伺服器 PUT 到 R2（S3 API，SigV4 header 簽章）。
//
// 這裡刻意沒有 server-only：這個模組本身一個機密都不碰（金鑰由呼叫端從
// 環境變數讀進來當參數），而那個標記會讓簽章的數學連測試都跑不起來。
// 唯一呼叫 r2ConfigFromEnv 的地方是 /api/admin/articles/upload 的 route，
// 那條路徑已經在 withStaff 後面。
//
// 為什麼不走 App 用的 media-upload edge function：那條路綁著貼文／留言的
// 票、暫存區、升級與清掃，全是為了「不受信任的客戶端直傳」設計的。寫手
// 是受信任的員工，圖片經過我們的 route（驗過身分、驗過格式）再放到最終
// key，沒有暫存與升級的必要。簽章邏輯照抄 supabase/functions/_shared/r2.ts，
// 只留 header 形式的 PUT。
//
// 需要的環境變數跟 edge function 同名：R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、
// R2_SECRET_ACCESS_KEY、R2_BUCKET、R2_PUBLIC_BASE（例如 https://img.dailyval.com）。
// 少任何一個就回 null，route 回 503，後台改成「先貼圖片網址」。

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

export function r2ConfigFromEnv(env: Record<string, string | undefined> = process.env): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID ?? "";
  const accessKeyId = env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = env.R2_BUCKET ?? "";
  const publicBase = (env.R2_PUBLIC_BASE ?? "").replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

const REGION = "auto";
const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";
/** key 是永久的（uuid），放心給一年。 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const ENCODER = new TextEncoder();

// RFC 3986。encodeURIComponent 漏掉 ! ' ( ) *，AWS 的規範要求它們也被編碼。
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function encodeKeyPath(key: string): string {
  return key.split("/").map(uriEncode).join("/");
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource)));
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, ENCODER.encode(data)));
}

async function signingKey(secret: string, date: string): Promise<Uint8Array> {
  let key = await hmac(ENCODER.encode("AWS4" + secret), date);
  key = await hmac(key, REGION);
  key = await hmac(key, SERVICE);
  return hmac(key, "aws4_request");
}

function timestamps(now: Date): { amzDate: string; date: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, date: amzDate.slice(0, 8) };
}

function host(cfg: R2Config): string {
  return `${cfg.accountId}.r2.cloudflarestorage.com`;
}

/**
 * 簽一個 PUT。Content-Type 與 Cache-Control 都在簽章裡，payload hash 也是：
 * 送出去的位元組跟簽的不一樣就 403。
 */
export async function signedPut(
  cfg: R2Config,
  key: string,
  body: Uint8Array,
  contentType: string,
  now: Date = new Date()
): Promise<{ url: string; headers: Record<string, string> }> {
  const { amzDate, date } = timestamps(now);
  const canonicalPath = `/${cfg.bucket}/${encodeKeyPath(key)}`;
  const payloadHash = await sha256Hex(body);
  const headers: Record<string, string> = {
    "cache-control": IMMUTABLE_CACHE_CONTROL,
    "content-type": contentType,
    host: host(cfg),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((n) => `${n}:${headers[n].trim()}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = ["PUT", canonicalPath, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    await sha256Hex(ENCODER.encode(canonicalRequest)),
  ].join("\n");
  const signature = hex(await hmac(await signingKey(cfg.secretAccessKey, date), stringToSign));
  return {
    url: `https://${host(cfg)}${canonicalPath}`,
    headers: {
      "Cache-Control": IMMUTABLE_CACHE_CONTROL,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization:
        `${ALGORITHM} Credential=${cfg.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

export async function putObject(
  cfg: R2Config,
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  const { url, headers } = await signedPut(cfg, key, body, contentType);
  const res = await fetch(url, { method: "PUT", headers, body: body as BodyInit });
  const text = await res.text().catch(() => "");
  if (res.status !== 200) return { ok: false, status: res.status, error: text.slice(0, 200) };
  return { ok: true, status: 200 };
}

export function publicURL(cfg: R2Config, key: string): string {
  return `${cfg.publicBase}/${encodeKeyPath(key)}`;
}
