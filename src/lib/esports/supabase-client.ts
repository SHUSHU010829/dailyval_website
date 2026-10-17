"use client";

// 瀏覽器端的 supabase-js 單例。
// 一定要用同一顆 client 做 auth 與 PostgREST——token 刷新後的自動
// 附掛只在同一顆 client 內成立（iOS 端同樣的教訓：分開的模組化
// client 會在刷新後默默變回匿名）。
// session 由 supabase-js 存 localStorage 並自動刷新。

import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";

function createEsportsClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    db: { schema: "esports" },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // 我們走 signInWithIdToken（popup），URL 裡不會有 session
      detectSessionInUrl: false,
    },
  });
}

let client: ReturnType<typeof createEsportsClient> | null = null;

export function getSupabase(): ReturnType<typeof createEsportsClient> {
  if (client) return client;
  client = createEsportsClient();
  return client;
}

// 只拿來驗證 token：這顆 client 不持有瀏覽器的登入，也不發 PostgREST 請求。
// getUser 驗到 session 不存在時會自動清它自己的 session；被拒的請求若屬於
// 較舊的那次登入，這個清理絕不能碰到共用 client 的儲存。
let authVerifier: ReturnType<typeof createClient> | null = null;

export function getAuthVerifier() {
  authVerifier ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storageKey: "dailyval-auth-verifier",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return authVerifier;
}
