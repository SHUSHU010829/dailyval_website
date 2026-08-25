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
