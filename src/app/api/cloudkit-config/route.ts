// 瀏覽器端 CloudKit JS 的設定來源。
// Web API token 依設計就是 client 可見的（CloudKit JS 需要它初始化）；
// 安全邊界是 CloudKit Console 上該 token 的 sign-in callback／來源限制
// 與資料庫的安全角色，不是 token 的保密性。

import { NextResponse } from "next/server";
import { CLOUDKIT_CONFIG, isCloudKitConfigured } from "@/lib/cloudkit/env";

export function GET() {
  if (!isCloudKitConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  return NextResponse.json({
    containerId: CLOUDKIT_CONFIG.containerId,
    apiToken: CLOUDKIT_CONFIG.apiToken,
    environment: CLOUDKIT_CONFIG.environment,
  });
}
