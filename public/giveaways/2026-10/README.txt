DailyVAL 2026 年 10 月抽獎：驗證檔案
（電競評分抽獎、颱風連假揪團抽獎）

檔案
  pools/*.csv            四個抽獎名單。entrant_id 是參加者代號：App 名單是帳號 ID 的雜湊，
                         Threads 名單是 Threads 帳號，揪團名單是房間 ID。Riot ID 已打碼。
  excluded/*.csv         沒有列入名單的人和原因。
  draw.py                抽獎程式（Python 3，只用標準函式庫）。
  SHA256SUMS             抽獎程式和四個名單的 SHA-256。
  commit.json            抽獎前公布的指紋和 drand 輪數。
  drand-33518532.json    drand 第 33518532 輪的原始資料。
  result.json            抽獎結果，也就是 draw.py 的輸出。

怎麼驗證
  1. shasum -a 256 -c SHA256SUMS
     五個檔案都應該是 OK。
  2. shasum -a 256 SHA256SUMS
     應該是 bd56a001dfbc04f7fda46d2466ae4c2378b1f377d965a86f984b84916c8282fa，
     2026-10-30 18:58（台灣時間）已經在官方 Threads 兩篇活動貼文底下公布。
  3. python3 draw.py 33518532 > mine.json && diff mine.json result.json
     沒有輸出就代表結果一樣。程式會自己到 drand 抓第 33518532 輪的亂數，
     那一輪在 2026-10-30 19:16:00（台灣時間）才產生。
  4. 也可以直接查那一輪：
     https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/33518532

抽獎方式
  每位參加者的分數 = SHA-256("<亂數>|<名單名稱>|<entrant_id>")，分數最小的中獎，
  接下來的依序是備取。四個名單依 draw.py 裡 DRAWS 的順序抽；留言池會跳過評分池
  已經中獎的人（同一人只能中一份 MyCard）。


DailyVAL October 2026 giveaways: verification files
(Esports rating giveaway, typhoon long weekend Team Up giveaway)

Files
  pools/*.csv            The four entrant lists. entrant_id is the entrant's code: a hash of the
                         account ID for the app lists, the Threads handle for the Threads list,
                         and the room ID for the Team Up list. Riot IDs are masked.
  excluded/*.csv         Who was left out, and why.
  draw.py                The draw script (Python 3, standard library only).
  SHA256SUMS             SHA-256 of the script and the four lists.
  commit.json            The fingerprint and drand round published before the draw.
  drand-33518532.json    The raw data of drand round 33518532.
  result.json            The result, i.e. the output of draw.py.

How to verify
  1. shasum -a 256 -c SHA256SUMS
     All five files should say OK.
  2. shasum -a 256 SHA256SUMS
     Should print bd56a001dfbc04f7fda46d2466ae4c2378b1f377d965a86f984b84916c8282fa, which was
     posted under both giveaway posts on DailyVAL's official Threads at 18:58 on 2026-10-30
     (Taiwan time).
  3. python3 draw.py 33518532 > mine.json && diff mine.json result.json
     No output means the result matches. The script fetches drand round 33518532 itself; that
     round was produced at 19:16:00 on 2026-10-30 (Taiwan time).
  4. You can also look the round up directly:
     https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/33518532

How the draw works
  Each entrant's score = SHA-256("<randomness>|<list name>|<entrant_id>"). The lowest scores win
  and the next ones are the alternates, in order. The four lists are drawn in the order of DRAWS
  in draw.py; the comment pool skips anyone who already won in the rating pool (one MyCard per
  person).
