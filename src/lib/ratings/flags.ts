// 造型評分的網頁寫入開關。
// 預設關閉：投票／留言的 CloudKit 寫入路徑帶著一個已知的跨 client
// 競態（web 與 iOS 並發第一票會重複計數），而造型評分已決定整體遷往
// Supabase（見 DailyVal repo docs/skin-rating-supabase-migration.md）——
// 網頁寫入等 Supabase 後端上線再開，瀏覽與排行榜（唯讀）不受影響。
export const SKIN_WRITES_ENABLED =
  process.env.NEXT_PUBLIC_SKIN_VOTING_ENABLED === "true";
