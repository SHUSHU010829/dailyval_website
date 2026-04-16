import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.support" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/support",
  });
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isZh = locale === "zh-TW";

  return (
    <LegalLayout
      title={isZh ? "幫助中心" : "Support"}
      lastUpdated={isZh ? "聯絡信箱：support@dailyval.com" : "Contact: support@dailyval.com"}
      backLabel={isZh ? "返回首頁" : "Back to Home"}
      backHref={`/${locale}`}
    >
      {isZh ? (
        <>
          <p>以下是玩家最常遇到的問題與解決方法。找不到答案？直接寄信給我們，我們會在 1–2 個工作天內回覆。</p>

          <h2>帳號與登入</h2>

          <h3>每次打開 App 都要重新登入，怎麼辦？</h3>
          <p>這是目前已知問題，與 Riot Games 的 token 過期機制有關。暫時解法：進入 App 設定 → 登出 → 重新以 Riot 帳號登入。我們持續努力改善登入持久性，後續更新會優化此問題。</p>

          <h3>綁定 Riot 帳號後看不到我的資料？</h3>
          <p>請確認您的 Riot ID 輸入正確（含 #XXXXX 後綴）。部分地區的 Valorant 帳號需要幾分鐘才能同步。若等待 5 分鐘後仍無法顯示，請嘗試登出後重新登入。</p>

          <h2>每日商城</h2>

          <h3>商城資料跟遊戲內不一樣？</h3>
          <p>商城資料由 Riot Games API 提供，通常每日重置後 5–10 分鐘內更新。若您看到的資料明顯落後，請下拉重新整理或重新啟動 App。</p>

          <h3>沒有收到商城更新通知？</h3>
          <p>請確認：(1) 已在 App 設定中開啟「商城通知」；(2) 您的手機系統設定允許 DailyVal 傳送通知。路徑：iPhone 設定 → 通知 → DailyVal → 允許通知。</p>

          <h2>戰績查詢</h2>

          <h3>最近的對局沒有顯示？</h3>
          <p>Riot Games API 有時會延遲 30 分鐘到數小時才回報最新對局。這不是 DailyVal 的問題，而是上游資料來源的限制。請稍後再試。</p>

          <h3>可以查其他玩家的戰績嗎？</h3>
          <p>可以。在搜尋列輸入對方的 Riot ID（格式：名稱#TAG），即可查看其公開的段位與戰績紀錄。</p>

          <h2>應用程式內購</h2>

          <h3>我的購買沒有生效？</h3>
          <p>請先確認 Apple ID 帳單資訊正確，並嘗試重新啟動 App。若問題持續，前往 App Store → 帳號 → 購買記錄，確認交易是否成功。如需退款，請直接聯絡 Apple 支援。</p>

          <h2>其他問題</h2>

          <h3>如何刪除帳號？</h3>
          <p>請寄信至 <a href="mailto:support@dailyval.com">support@dailyval.com</a> 並告知您的 Riot ID，我們將在 7 個工作天內處理。</p>

          <h3>我想回報 Bug 或提供功能建議</h3>
          <p>非常歡迎！請寄信至 <a href="mailto:support@dailyval.com">support@dailyval.com</a>，說明問題發生的步驟或您的建議，我們會認真評估每一封回饋。</p>

          <h2>聯絡我們</h2>
          <p>上述解法都無法解決問題？請寄信至 <a href="mailto:support@dailyval.com">support@dailyval.com</a>，附上您的 Riot ID 與問題描述，我們會在 1–2 個工作天內回覆。</p>
        </>
      ) : (
        <>
          <p>Here are answers to the most common issues players run into. Can't find what you need? Email us directly — we reply within 1–2 business days.</p>

          <h2>Account and Login</h2>

          <h3>Why do I get logged out every time I open the app?</h3>
          <p>This is a known issue related to how Riot Games handles token expiration. Workaround: go to App Settings → Log Out → sign back in with your Riot account. We're actively working on improving login persistence in a future update.</p>

          <h3>I linked my Riot account but my data isn't showing up?</h3>
          <p>Double-check that your Riot ID is entered correctly (including the #XXXXX suffix). Some regional Valorant accounts can take a few minutes to sync. If nothing appears after 5 minutes, try logging out and back in.</p>

          <h2>Daily Shop</h2>

          <h3>The shop in the app doesn't match the game?</h3>
          <p>Shop data is sourced from the Riot Games API and typically updates within 5–10 minutes of the daily reset. If the data appears stale, pull to refresh or restart the app.</p>

          <h3>I'm not getting shop update notifications?</h3>
          <p>Check two things: (1) "Shop Notifications" is enabled in DailyVal's in-app settings; (2) your iPhone allows DailyVal to send notifications — go to iPhone Settings → Notifications → DailyVal → Allow Notifications.</p>

          <h2>Match History</h2>

          <h3>My recent matches aren't showing up?</h3>
          <p>The Riot Games API sometimes delays reporting recent matches by 30 minutes to a few hours. This is an upstream data limitation, not a DailyVal issue. Please check back later.</p>

          <h3>Can I look up other players?</h3>
          <p>Yes. Enter their Riot ID in the search bar (format: Name#TAG) to view their public rank and match history.</p>

          <h2>In-App Purchases</h2>

          <h3>My purchase didn't activate?</h3>
          <p>Confirm that your Apple ID billing info is up to date, then restart the app. If the issue persists, check App Store → Account → Purchase History to confirm the transaction went through. For refunds, contact Apple Support directly.</p>

          <h2>Other Questions</h2>

          <h3>How do I delete my account?</h3>
          <p>Email <a href="mailto:support@dailyval.com">support@dailyval.com</a> with your Riot ID and a request to delete your account. We'll process it within 7 business days.</p>

          <h3>I want to report a bug or suggest a feature</h3>
          <p>We'd love to hear from you. Email <a href="mailto:support@dailyval.com">support@dailyval.com</a> with the steps to reproduce the issue or your suggestion — we read every message.</p>

          <h2>Contact Us</h2>
          <p>Still stuck? Email <a href="mailto:support@dailyval.com">support@dailyval.com</a> with your Riot ID and a description of the issue. We'll get back to you within 1–2 business days.</p>
        </>
      )}
    </LegalLayout>
  );
}
