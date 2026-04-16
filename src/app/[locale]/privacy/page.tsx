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
  const t = await getTranslations({ locale, namespace: "meta.privacy" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/privacy",
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isZh = locale === "zh-TW";

  return (
    <LegalLayout
      title={isZh ? "隱私政策" : "Privacy Policy"}
      lastUpdated={isZh ? "最後更新：2025 年 1 月 1 日" : "Last updated: January 1, 2025"}
      backLabel={isZh ? "返回首頁" : "Back to Home"}
      backHref={`/${locale}`}
    >
      {isZh ? (
        <>
          <p>DailyVal（以下稱「我們」）重視您的隱私。本政策說明我們如何收集、使用及保護您的個人資料。</p>

          <h2>1. 我們收集的資料</h2>

          <h3>您主動提供的資料</h3>
          <ul>
            <li>Riot Games 帳號（Riot ID）：用於連結您的遊戲資料</li>
            <li>社群貼文內容：您在社群版主動發布的文字與圖片</li>
          </ul>

          <h3>自動收集的資料</h3>
          <ul>
            <li>遊戲資料：段位、對戰紀錄、造型清單（透過 Riot Games API 取得）</li>
            <li>使用資料：功能使用頻率、裝置型號、作業系統版本、崩潰報告</li>
            <li>推播通知設定：是否啟用商城更新通知</li>
          </ul>

          <h2>2. 資料的使用方式</h2>
          <ul>
            <li>提供並維持核心服務功能（商城追蹤、戰績查詢、社群互動）</li>
            <li>傳送商城更新推播通知（需您明確同意）</li>
            <li>分析應用程式效能與使用行為，以持續改善服務</li>
            <li>偵測並防止濫用行為</li>
          </ul>

          <h2>3. 資料分享</h2>
          <p>我們不會出售您的個人資料。以下情況我們可能共享資料：</p>
          <ul>
            <li><strong>Riot Games</strong>：透過官方 API 取得遊戲資料，適用 Riot Games 隱私政策</li>
            <li><strong>Apple</strong>：應用程式內購透過 Apple 處理，適用 Apple 隱私政策</li>
            <li><strong>分析服務商</strong>：匿名化的使用統計資料，用於改善應用程式</li>
            <li><strong>法律要求</strong>：依法律規定或政府機關要求時</li>
          </ul>

          <h2>4. 資料儲存與安全</h2>
          <p>您的資料儲存於受保護的雲端伺服器。我們採用業界標準的加密措施保護傳輸中及靜態資料。儘管如此，沒有任何網路傳輸方式能保證 100% 安全，請妥善保管您的帳號認證資訊。</p>

          <h2>5. 資料保留</h2>
          <p>帳號活躍期間我們將保留您的資料。若您刪除帳號，我們將在 30 天內刪除您的個人資料（法律合規要求保留的部分除外）。</p>

          <h2>6. 兒童隱私</h2>
          <p>本服務不針對 13 歲以下兒童提供服務。若我們發現誤收兒童資料，將立即刪除。</p>

          <h2>7. 您的權利</h2>
          <p>您有權：</p>
          <ul>
            <li>查閱我們持有的您的個人資料</li>
            <li>要求更正不正確的資料</li>
            <li>要求刪除您的帳號及相關資料</li>
            <li>關閉推播通知</li>
          </ul>
          <p>如需行使上述權利，請聯絡 <a href="mailto:support@dailyval.com">support@dailyval.com</a>。</p>

          <h2>8. 政策更新</h2>
          <p>我們可能不定期更新本隱私政策。重大變更將透過應用程式通知。繼續使用本服務即表示您同意更新後的政策。</p>

          <h2>9. 聯絡我們</h2>
          <p>隱私相關問題請聯絡：<a href="mailto:support@dailyval.com">support@dailyval.com</a></p>
        </>
      ) : (
        <>
          <p>DailyVal ("we", "us", or "our") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding it.</p>

          <h2>1. Data We Collect</h2>

          <h3>Data You Provide</h3>
          <ul>
            <li>Riot Games account (Riot ID): used to link your in-game data</li>
            <li>Community posts: text and images you voluntarily publish in the community section</li>
          </ul>

          <h3>Data Collected Automatically</h3>
          <ul>
            <li>Game data: rank, match history, cosmetics (retrieved via Riot Games API)</li>
            <li>Usage data: feature usage frequency, device model, OS version, crash reports</li>
            <li>Push notification preferences: whether shop update notifications are enabled</li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To provide and maintain core features (shop tracking, match analytics, community)</li>
            <li>To send shop update push notifications (requires your explicit consent)</li>
            <li>To analyze app performance and usage to improve the Service</li>
            <li>To detect and prevent abuse</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data in the following cases:</p>
          <ul>
            <li><strong>Riot Games</strong>: game data is retrieved via the official API, subject to Riot Games' Privacy Policy</li>
            <li><strong>Apple</strong>: in-app purchases are processed by Apple, subject to Apple's Privacy Policy</li>
            <li><strong>Analytics providers</strong>: anonymized usage statistics to improve the app</li>
            <li><strong>Legal requirements</strong>: when required by law or government authority</li>
          </ul>

          <h2>4. Data Storage and Security</h2>
          <p>Your data is stored on protected cloud servers using industry-standard encryption for data in transit and at rest. No method of internet transmission is 100% secure — please protect your account credentials accordingly.</p>

          <h2>5. Data Retention</h2>
          <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>

          <h2>6. Children's Privacy</h2>
          <p>This Service is not directed at children under 13. If we become aware that we have inadvertently collected data from a child under 13, we will delete it promptly.</p>

          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of push notifications</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:support@dailyval.com">support@dailyval.com</a>.</p>

          <h2>8. Policy Updates</h2>
          <p>We may update this Privacy Policy periodically. Significant changes will be communicated through the app. Continued use of the Service constitutes acceptance of the updated policy.</p>

          <h2>9. Contact Us</h2>
          <p>Privacy questions: <a href="mailto:support@dailyval.com">support@dailyval.com</a></p>
        </>
      )}
    </LegalLayout>
  );
}
