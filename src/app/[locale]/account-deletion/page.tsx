import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

// Tally 表單 ID（https://tally.so 建立後，網址 tally.so/r/<ID> 的 <ID>）。
// 表單欄位:Email(必填,type: email,標籤「Apple 登入信箱」)+
// 備註(選填,長文字)。未設定前頁面會顯示信箱申請的備援說明。
const TALLY_FORM_ID = "";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.accountDeletion" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/account-deletion",
  });
}

export default async function AccountDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isZh = locale === "zh-TW";

  // 內嵌 Tally;dynamicHeight 需要外掛 script,固定高度即可
  const tallyEmbed = TALLY_FORM_ID ? (
    <div className="cut my-6 overflow-hidden border border-border-med bg-bg-panel">
      <iframe
        src={`https://tally.so/embed/${TALLY_FORM_ID}?alignLeft=1&hideTitle=1&transparentBackground=1`}
        title={isZh ? "刪除帳號申請表單" : "Account deletion request form"}
        loading="lazy"
        className="h-[420px] w-full border-0"
      />
    </div>
  ) : null;

  return (
    <LegalLayout
      title={isZh ? "刪除電競評分帳號" : "Delete Your Esports Rating Account"}
      lastUpdated={isZh ? "最後更新:2026 年 8 月 8 日" : "Last updated: August 8, 2026"}
      backLabel={isZh ? "返回首頁" : "Back to Home"}
      backHref={`/${locale}`}
    >
      {isZh ? (
        <>
          <p>
            這個頁面用於申請刪除您在 DailyVal 的<strong>電競評分帳號</strong>
            (以「使用 Apple 帳號登入」建立的帳號)。刪除是永久性的,無法復原。
          </p>

          <h2>這會刪除什麼</h2>
          <ul>
            <li>您對選手與比賽的所有評分</li>
            <li>您的所有留言與回覆</li>
            <li>您的顯示名稱與頭像設定</li>
            <li>您的封鎖名單</li>
            <li>帳號本身(與 Apple 帳號的連結)</li>
          </ul>
          <p>
            <strong>不受影響</strong>:您在 App 內連結的 Riot
            帳號、每日商城紀錄、戰績等其他功能資料 —
            電競評分帳號與它們是分開的。
          </p>

          <h2>步驟一:找到您的登入信箱</h2>
          <p>申請時需要您當初登入用的信箱。查詢路徑:</p>
          <ol>
            <li>打開 iPhone「設定」,點最上方您的名稱</li>
            <li>「登入與安全性」→「使用 Apple 帳號登入的 App」</li>
            <li>找到 DailyVal,查看顯示的電子郵件地址</li>
          </ol>
          <p>
            如果當初選了「隱藏我的電子郵件」,這裡顯示的會是一組{" "}
            <code>@privaterelay.appleid.com</code> 的轉發地址 —
            請填寫那一組地址。
          </p>

          <h2>步驟二:送出申請</h2>
          {tallyEmbed ?? (
            <p>
              請寄信至{" "}
              <a href="mailto:support@dailyval.com?subject=刪除電競評分帳號">
                support@dailyval.com
              </a>
              ,主旨註明「刪除電競評分帳號」,內文附上步驟一查到的登入信箱。
            </p>
          )}
          <p>
            轉發地址(<code>@privaterelay.appleid.com</code>
            )無法被他人猜到,我們會直接處理;一般信箱我們會先寄一封確認信,
            收到您的回覆後才會執行刪除。確認後 7 個工作天內完成(通常更快),
            完成時會回信通知您。
          </p>

          <h2>步驟三(建議):撤銷 Apple 授權</h2>
          <p>
            刪除完成後,建議回到步驟一的同一個頁面,點 DailyVal
            →「停止使用 Apple 帳號登入」,徹底移除授權。之後 App
            會自動回到未登入狀態;您隨時可以重新登入,但那會是一個全新的帳號。
          </p>

          <h2>其他問題</h2>
          <p>
            表單送不出去、或有任何疑問,直接寄信到{" "}
            <a href="mailto:support@dailyval.com">support@dailyval.com</a>
            ,我們會在 1–2 個工作天內回覆。
          </p>
        </>
      ) : (
        <>
          <p>
            Use this page to request deletion of your DailyVal{" "}
            <strong>esports rating account</strong> (the account created with
            Sign in with Apple). Deletion is permanent and cannot be undone.
          </p>

          <h2>What gets deleted</h2>
          <ul>
            <li>All your player and match ratings</li>
            <li>All your comments and replies</li>
            <li>Your display name and avatar settings</li>
            <li>Your block list</li>
            <li>The account itself (its link to your Apple ID)</li>
          </ul>
          <p>
            <strong>Not affected</strong>: your linked Riot account, daily
            store history, match records, and other app data — the esports
            rating account is separate from all of them.
          </p>

          <h2>Step 1: Find your sign-in email</h2>
          <p>The request needs the email address your account signed in with:</p>
          <ol>
            <li>Open iPhone Settings and tap your name at the top</li>
            <li>
              Sign-In &amp; Security → Apps Using Apple Account (Sign in with
              Apple)
            </li>
            <li>Find DailyVal and note the email address shown</li>
          </ol>
          <p>
            If you chose &ldquo;Hide My Email&rdquo; when signing up, the
            address shown is a <code>@privaterelay.appleid.com</code> relay —
            submit that one.
          </p>

          <h2>Step 2: Submit the request</h2>
          {tallyEmbed ?? (
            <p>
              Email{" "}
              <a href="mailto:support@dailyval.com?subject=Delete%20esports%20rating%20account">
                support@dailyval.com
              </a>{" "}
              with the subject &ldquo;Delete esports rating account&rdquo; and
              the sign-in email from step 1.
            </p>
          )}
          <p>
            Relay addresses (<code>@privaterelay.appleid.com</code>) cannot be
            guessed by anyone else, so we process them directly; for regular
            addresses we first send a confirmation email and delete only after
            you reply. Deletion completes within 7 business days of
            confirmation (usually much sooner), and we email you when it is
            done.
          </p>

          <h2>Step 3 (recommended): Revoke the Apple authorization</h2>
          <p>
            After deletion, return to the same Settings page from step 1, tap
            DailyVal, and choose &ldquo;Stop Using Apple Account&rdquo; to
            remove the authorization entirely. The app returns to a signed-out
            state automatically; you can sign in again any time, but that will
            be a brand-new account.
          </p>

          <h2>Questions</h2>
          <p>
            If the form does not work or you have any questions, email{" "}
            <a href="mailto:support@dailyval.com">support@dailyval.com</a> and
            we will reply within 1–2 business days.
          </p>
        </>
      )}
    </LegalLayout>
  );
}
