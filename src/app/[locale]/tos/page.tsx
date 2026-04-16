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
  const t = await getTranslations({ locale, namespace: "meta.tos" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/tos",
  });
}

export default async function TosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isZh = locale === "zh-TW";

  return (
    <LegalLayout
      title={isZh ? "服務條款" : "Terms of Service"}
      lastUpdated={isZh ? "最後更新：2025 年 1 月 1 日" : "Last updated: January 1, 2025"}
      backLabel={isZh ? "返回首頁" : "Back to Home"}
      backHref={`/${locale}`}
    >
      {isZh ? (
        <>
          <p>歡迎使用 DailyVal（以下稱「本服務」）。請在使用前詳閱以下服務條款。使用本服務即表示您同意遵守以下條款。</p>

          <h2>1. 服務說明</h2>
          <p>DailyVal 是一款提供 Valorant 玩家查看每日商城、追蹤戰績、參與社群討論的行動應用程式。本服務為免費提供，部分進階功能需透過應用程式內購買（App 內購）取得。</p>

          <h2>2. 帳號與資格</h2>
          <p>使用本服務須年滿 13 歲。您需要一組有效的 Riot Games 帳號以連結您的 Valorant 遊戲資料。您有責任妥善保管您的帳號資訊，並對帳號下的所有活動負責。</p>

          <h2>3. 第三方資料與 Riot Games</h2>
          <p>本服務透過 Riot Games 官方開放 API 取得遊戲相關資料，包含段位、戰績、造型資訊等。DailyVal 不隸屬於 Riot Games，亦非 Riot Games 之官方合作夥伴。遊戲資料的準確性取決於 Riot Games API 的即時狀態。</p>

          <h2>4. 應用程式內購</h2>
          <p>部分功能需透過 App 內購解鎖。所有消費均透過 Apple App Store 處理，適用 Apple 的退款政策。DailyVal 不提供額外退款，如有消費爭議請聯絡 Apple 支援。</p>

          <h2>5. 使用者生成內容</h2>
          <p>您在社群版發布的內容（含文字、圖片）由您本人負責。請勿發布以下內容：</p>
          <ul>
            <li>含有仇恨、歧視、騷擾或威脅性質的言論</li>
            <li>散布不實資訊或惡意謠言</li>
            <li>廣告或垃圾訊息</li>
            <li>任何形式的作弊軟體推廣或外掛程式</li>
          </ul>
          <p>DailyVal 保留刪除違規內容及停用帳號的權利，恕不另行通知。</p>

          <h2>6. 知識產權</h2>
          <p>Valorant、VALORANT 標誌及所有相關遊戲素材為 Riot Games 所有。DailyVal 的應用程式設計、品牌視覺及原創內容為 DailyVal 所有，未經授權不得複製或再利用。</p>

          <h2>7. 免責聲明</h2>
          <p>本服務以「現狀」提供，不保證商城資料即時性、戰績資料完整性或服務的連續可用性。DailyVal 對因使用本服務所造成的任何直接或間接損失不承擔責任。</p>

          <h2>8. 服務變更與終止</h2>
          <p>DailyVal 保留隨時修改、暫停或終止部分或全部服務的權利。重大條款變更將提前於應用程式內通知。</p>

          <h2>9. 適用法律</h2>
          <p>本服務條款受中華民國（台灣）法律管轄。</p>

          <h2>10. 聯絡我們</h2>
          <p>如對本條款有任何疑問，請透過以下方式聯絡：<a href="mailto:support@dailyval.com">support@dailyval.com</a></p>
        </>
      ) : (
        <>
          <p>Welcome to DailyVal (the "Service"). Please read these Terms of Service carefully before using the Service. By accessing or using the Service, you agree to be bound by these terms.</p>

          <h2>1. Description of Service</h2>
          <p>DailyVal is a mobile application that provides Valorant players with daily shop tracking, match performance analytics, and community features. The Service is free to use, with select premium features available through in-app purchases.</p>

          <h2>2. Account Eligibility</h2>
          <p>You must be at least 13 years old to use this Service. A valid Riot Games account is required to link your Valorant data. You are responsible for maintaining the security of your account and for all activities that occur under it.</p>

          <h2>3. Third-Party Data and Riot Games</h2>
          <p>DailyVal retrieves game data — including rank, match history, and cosmetics — through the official Riot Games API. DailyVal is not affiliated with or endorsed by Riot Games. Data accuracy depends on the availability and timeliness of the Riot Games API.</p>

          <h2>4. In-App Purchases</h2>
          <p>Certain features require in-app purchases to unlock. All transactions are processed through the Apple App Store and are subject to Apple's refund policy. DailyVal does not issue separate refunds. For purchase disputes, please contact Apple Support.</p>

          <h2>5. User-Generated Content</h2>
          <p>You are responsible for all content you post in the community section. The following content is prohibited:</p>
          <ul>
            <li>Hate speech, discrimination, harassment, or threats</li>
            <li>Misinformation or malicious rumors</li>
            <li>Spam or unsolicited advertising</li>
            <li>Promotion of cheating software or exploits</li>
          </ul>
          <p>DailyVal reserves the right to remove content and suspend accounts that violate these guidelines, without prior notice.</p>

          <h2>6. Intellectual Property</h2>
          <p>Valorant, the VALORANT logo, and all related game assets are property of Riot Games. DailyVal's app design, brand visuals, and original content are property of DailyVal. Unauthorized reproduction or reuse is prohibited.</p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>The Service is provided "as is" without warranties of any kind. DailyVal does not guarantee the real-time accuracy of shop data, completeness of match records, or uninterrupted service availability. DailyVal is not liable for any direct or indirect damages arising from use of the Service.</p>

          <h2>8. Service Modifications and Termination</h2>
          <p>DailyVal reserves the right to modify, suspend, or discontinue any part of the Service at any time. Significant changes to these terms will be communicated in advance through the app.</p>

          <h2>9. Governing Law</h2>
          <p>These Terms of Service are governed by the laws of the Republic of China (Taiwan).</p>

          <h2>10. Contact Us</h2>
          <p>For questions regarding these terms, contact us at: <a href="mailto:support@dailyval.com">support@dailyval.com</a></p>
        </>
      )}
    </LegalLayout>
  );
}
