// 把後台在本機跑起來的一鍵準備:建帳號、給管理員、灌假資料,最後印出
// 要貼的兩段東西。
//
//   cd ~/Desktop/DailyVal && supabase start && supabase db reset
//   cd "../DailyVal website/dailyval_website"
//   node scripts/seed-admin-local.mjs
//
// 為什麼不直接在正式庫上試:正式庫的檢舉佇列是空的,要看到東西就得先往
// 正式庫塞假檢舉再記得刪掉。本機沒有那個問題,而且亂按也不會弄壞真資料。
//
// 網站平常寫死正式庫的網址;這支腳本印出的 .env.local 會把它指到 CLI 起的
// 那一套。刪掉那個檔案就回到正式庫。
//
// 登入用的是本機 auth 的 email/password——正式站只有 Sign in with Apple,
// 而 Apple 那條路沒辦法指向 localhost。所以這裡直接把換到的 session 塞進
// localStorage,繞過登入畫面而不是替它加一條後門。

import { execFileSync } from "node:child_process";

const API = "http://127.0.0.1:54321";
const EMAIL = "admin@example.test";
const PASSWORD = "local-admin-pw-123";

function status() {
  try {
    return JSON.parse(
      execFileSync("supabase", ["status", "-o", "json"], {
        encoding: "utf8",
        cwd: `${process.env.HOME}/Desktop/DailyVal`,
      })
    );
  } catch {
    console.error("supabase 本機環境沒起來。先在 ~/Desktop/DailyVal 跑:");
    console.error("  supabase start && supabase db reset");
    process.exit(1);
  }
}

const { ANON_KEY, SERVICE_ROLE_KEY, DB_URL } = status();

async function auth(path, body) {
  const res = await fetch(`${API}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, body: await res.json() };
}

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "-i", "supabase_db_nhmtjmzbcibvzzdewptq", "psql", "-U", "postgres",
     "-tAq", "-v", "ON_ERROR_STOP=1"],
    { encoding: "utf8", input: sql }
  ).trim();
}

// ── 1. 帳號 ────────────────────────────────────────────────────────────────
let signIn = await auth("token?grant_type=password", { email: EMAIL, password: PASSWORD });
if (!signIn.ok) {
  const created = await auth("signup", { email: EMAIL, password: PASSWORD });
  if (!created.ok) {
    console.error("建立本機帳號失敗:", created.body);
    process.exit(1);
  }
  signIn = created;
}
const session = signIn.body;
function uidFromToken(jwt) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).sub;
}
const uid = session.user?.id ?? uidFromToken(session.access_token);
console.log(`帳號 ${EMAIL} → ${uid}`);

// ── 2. 管理員 + 假資料 ─────────────────────────────────────────────────────
// 用 psql 而不是 PostgREST:identity schema 刻意沒有對外曝光。
psql(`
insert into identity.admins (user_id, note) values ('${uid}', 'local dev')
  on conflict do nothing;

-- 兩個被檢舉的人,其中一個有前科,好看出佇列上的「作者前科」標記。
insert into auth.users (id) values
  ('11110000-0000-0000-0000-000000000001'),
  ('11110000-0000-0000-0000-000000000002')
on conflict do nothing;
update identity.profiles set display_name = '路人甲'
 where id = '11110000-0000-0000-0000-000000000001';
update identity.profiles set display_name = '慣犯乙'
 where id = '11110000-0000-0000-0000-000000000002';

delete from social.posts where body like '[本機測試]%';
-- moderation_actions 的 target_id 沒有外鍵,刪貼文帶不走它。不清的話重跑
-- 幾次就累積幾筆,而「作者前科」正是審核時最會被相信的那個數字。
delete from social.moderation_actions
 where target_id in ('22220000-0000-0000-0000-000000000001',
                     '22220000-0000-0000-0000-000000000002',
                     '33330000-0000-0000-0000-000000000001');

insert into social.posts (id, author_id, body) values
  ('22220000-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000001',
   '[本機測試] 這是一篇被檢舉的貼文,按「下架並結案」看看。'),
  ('22220000-0000-0000-0000-000000000002',
   '11110000-0000-0000-0000-000000000002',
   '[本機測試] 這篇的作者有前科,佇列上應該看得到標記。');

insert into social.comments (id, post_id, author_id, body) values
  ('33330000-0000-0000-0000-000000000001',
   '22220000-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000002',
   '[本機測試] 一則被檢舉的留言。下架它,上面那篇的留言數要跟著變 0。');

-- 慣犯乙的前科:一筆過去的處置紀錄。
insert into social.moderation_actions (admin_id, action, target_kind, target_id, reason)
values ('${uid}', 'hide', 'post', '22220000-0000-0000-0000-000000000002', '之前就下架過');

insert into social.reports (target_kind, target_id, reporter_id, reason) values
  ('post',    '22220000-0000-0000-0000-000000000001', '${uid}', '廣告'),
  ('post',    '22220000-0000-0000-0000-000000000002', '${uid}', '人身攻擊'),
  ('comment', '33330000-0000-0000-0000-000000000001', '${uid}', '洗版');

insert into identity.badge_applications (user_id, nickname, links, intro)
values ('11110000-0000-0000-0000-000000000001', '路人甲',
        array['https://youtube.com/@example'], '[本機測試] 我是創作者,請給我藍勾勾')
on conflict do nothing;
`);

const counts = psql(`
select (select count(*) from social.reports where status = 'open') || ' 筆待處理檢舉, ' ||
       (select count(*) from identity.badge_applications where status = 'pending') ||
       ' 筆待審藍勾勾';`);
console.log(`已灌入:${counts}`);

// ── 3. 要貼的東西 ──────────────────────────────────────────────────────────
const storageKey = `sb-${new URL(API).host.replace(/[.:]/g, "-")}-auth-token`;
console.log(`
────────────────────────────────────────────────────────────
1) 寫進 dailyval_website/.env.local(已經有就補這三行):

NEXT_PUBLIC_SUPABASE_URL=${API}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

2) npm run dev,開 http://localhost:3000/admin
   會看到登入畫面(Apple 那顆按鈕在本機沒用)。開瀏覽器 console 貼這一行,
   然後重新整理:

localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(session))})

   佇列就會出現。

3) 試完清乾淨:
   cd ~/Desktop/DailyVal && supabase db reset
   並且刪掉 .env.local 那三行(留著的話 dev 會一直指向本機)。
────────────────────────────────────────────────────────────

值得按按看的幾件事:
  · 「下架並結案」那則留言 → 上面那篇貼文的留言數要從 1 變 0
  · 「刪除」→ 一定會問理由,空白不給過
  · 慣犯乙那一列 → 應該顯示「作者前科 1 次」
  · 把自己從 identity.admins 刪掉再重新整理 → 整頁應該變 404,不是錯誤訊息
    (psql: delete from identity.admins;)
`);
console.log(`（DB: ${DB_URL}）`);
