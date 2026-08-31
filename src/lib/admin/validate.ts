// route 收到的東西全部經過這裡。呼叫端是已驗證的管理員，但「已驗證」不等於
// 「送來的一定是合法的」——瀏覽器可能帶著半填的表單、舊分頁、或是被改過的
// 請求。資料庫那一批對每個壞輸入都有明確的錯誤，但在這裡擋掉可以省一次
// 往返，也讓錯誤訊息是給人看的。
//
// 這裡刻意沒有 `server-only`：它一個機密都不碰，而那個標記會讓它連測試都
// 跑不起來。守著 service_role key 的是 server.ts，標記在那裡。

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BadInput extends Error {}

export function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new BadInput(`${field} must be a uuid`);
  }
  return value.toLowerCase();
}

export function targetKind(value: unknown): "post" | "comment" {
  if (value !== "post" && value !== "comment") {
    throw new BadInput("kind must be post or comment");
  }
  return value;
}

export function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new BadInput(`${field} must be true or false`);
  return value;
}

/** 理由是要留給未來的自己看的，所以有長度上限也有下限。 */
export function reason(value: unknown, { required }: { required: boolean }): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new BadInput("a reason is required");
    return null;
  }
  if (typeof value !== "string") throw new BadInput("reason must be text");
  const trimmed = value.trim();
  if (required && trimmed === "") throw new BadInput("a reason is required");
  if (trimmed.length > 500) throw new BadInput("reason is too long (500 max)");
  return trimmed === "" ? null : trimmed;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new BadInput(`${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

/** null = 永久封禁,那是刻意的選項而不是漏填。 */
export function optionalTimestamp(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new BadInput(`${field} must be a date`);
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new BadInput(`${field} is not a valid date`);
  if (ms <= Date.now()) throw new BadInput(`${field} must be in the future`);
  return new Date(ms).toISOString();
}

export function pageParams(url: URL): { limit: number; offset: number } {
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  return {
    limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
  };
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BadInput("body must be a JSON object");
    }
    return body as Record<string, unknown>;
  } catch (err) {
    if (err instanceof BadInput) throw err;
    throw new BadInput("body must be valid JSON");
  }
}
