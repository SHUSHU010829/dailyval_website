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
  const common = await getTranslations({ locale, namespace: "common" });
  const legal = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalLayout
      title="Terms and Conditions"
      lastUpdated="Last updated: August 29, 2026"
      backLabel={common("backHome")}
      backHref={`/${locale}`}
    >
      {locale !== "en" && (
        <p className="cut-sm border border-border-med bg-bg-elevated p-4 text-sm text-text-2">
          {legal("englishOnlyNotice")}
        </p>
      )}
      <p>Please read these terms and conditions carefully before using Our Service.</p>

      <h2>Interpretation and Definitions</h2>

      <h3>Interpretation</h3>
      <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

      <h3>Definitions</h3>
      <p>For the purposes of these Terms and Conditions:</p>
      <ul>
        <li><strong>Application</strong> means the software program provided by the Company downloaded by You on any electronic device, named DailyVal</li>
        <li><strong>Application Store</strong> means the digital distribution service operated and developed by Apple Inc. (Apple App Store) or Google Inc. (Google Play Store) in which the Application has been downloaded.</li>
        <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where &quot;control&quot; means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
        <li><strong>Country</strong> refers to: Taiwan</li>
        <li><strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in this Agreement) refers to DailyVal.</li>
        <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
        <li><strong>Service</strong> refers to the Application.</li>
        <li><strong>Terms and Conditions</strong> (also referred as &quot;Terms&quot;) mean these Terms and Conditions that form the entire agreement between You and the Company regarding the use of the Service.</li>
        <li><strong>Third-party Social Media Service</strong> means any services or content (including data, information, products or services) provided by a third-party that may be displayed, included or made available by the Service.</li>
        <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
      </ul>

      <h2>Acknowledgment</h2>
      <p>These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.</p>
      <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.</p>
      <p>By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.</p>
      <p>You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.</p>
      <p>Your access to and use of the Service is also conditioned on Your acceptance of and compliance with the Privacy Policy of the Company. Our Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your personal information when You use the Application or the Website and tells You about Your privacy rights and how the law protects You. Please read Our Privacy Policy carefully before using Our Service.</p>

      <h2>Links to Other Websites</h2>
      <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by the Company.</p>
      <p>The Company has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services. You further acknowledge and agree that the Company shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any such content, goods or services available on or through any such web sites or services.</p>
      <p>We strongly advise You to read the terms and conditions and privacy policies of any third-party web sites or services that You visit.</p>

      <h2>Termination</h2>
      <p>We may terminate or suspend Your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.</p>
      <p>Upon termination, Your right to use the Service will cease immediately.</p>

      <h2>Limitation of Liability</h2>
      <p>Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of this Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service or 100 USD if You haven&apos;t purchased anything through the Service.</p>
      <p>To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service, third-party software and/or third-party hardware used with the Service, or otherwise in connection with any provision of this Terms), even if the Company or any supplier has been advised of the possibility of such damages and even if the remedy fails of its essential purpose.</p>
      <p>Some states do not allow the exclusion of implied warranties or limitation of liability for incidental or consequential damages, which means that some of the above limitations may not apply. In these states, each party&apos;s liability will be limited to the greatest extent permitted by law.</p>

      <h2>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot; Disclaimer</h2>
      <p>The Service is provided to You &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service, including all implied warranties of merchantability, fitness for a particular purpose, title and non-infringement, and warranties that may arise out of course of dealing, course of performance, usage or trade practice. Without limitation to the foregoing, the Company provides no warranty or undertaking, and makes no representation of any kind that the Service will meet Your requirements, achieve any intended results, be compatible or work with any other software, applications, systems or services, operate without interruption, meet any performance or reliability standards or be error free or that any errors or defects can or will be corrected.</p>
      <p>Without limiting the foregoing, neither the Company nor any of the company&apos;s provider makes any representation or warranty of any kind, express or implied: (i) as to the operation or availability of the Service, or the information, content, and materials or products included thereon; (ii) that the Service will be uninterrupted or error-free; (iii) as to the accuracy, reliability, or currency of any information or content provided through the Service; or (iv) that the Service, its servers, the content, or e-mails sent from or on behalf of the Company are free of viruses, scripts, trojan horses, worms, malware, timebombs or other harmful components.</p>
      <p>Some jurisdictions do not allow the exclusion of certain types of warranties or limitations on applicable statutory rights of a consumer, so some or all of the above exclusions and limitations may not apply to You. But in such a case the exclusions and limitations set forth in this section shall be applied to the greatest extent enforceable under applicable law.</p>

      <h2>Governing Law</h2>
      <p>The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.</p>

      <h2>Disputes Resolution</h2>
      <p>If You have any concern or dispute about the Service, You agree to first try to resolve the dispute informally by contacting the Company.</p>

      <h2>For European Union (EU) Users</h2>
      <p>If You are a European Union consumer, you will benefit from any mandatory provisions of the law of the country in which you are resident in.</p>

      <h2>United States Legal Compliance</h2>
      <p>You represent and warrant that (i) You are not located in a country that is subject to the United States government embargo, or that has been designated by the United States government as a &quot;terrorist supporting&quot; country, and (ii) You are not listed on any United States government list of prohibited or restricted parties.</p>

      <h2>Severability and Waiver</h2>
      <h3>Severability</h3>
      <p>If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.</p>
      <h3>Waiver</h3>
      <p>Except as provided herein, the failure to exercise a right or to require performance of an obligation under these Terms shall not effect a party&apos;s ability to exercise such right or require such performance at any time thereafter nor shall the waiver of a breach constitute a waiver of any subsequent breach.</p>

      <h2>Translation Interpretation</h2>
      <p>These Terms and Conditions may have been translated if We have made them available to You on our Service. You agree that the original English text shall prevail in the case of a dispute.</p>

      <h2>Changes to These Terms and Conditions</h2>
      <p>We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion.</p>
      <p>By continuing to access or use Our Service after those revisions become effective, You agree to be bound by the revised terms. If You do not agree to the new terms, in whole or in part, please stop using the website and the Service.</p>

      <h2>Subscription and Payment Terms</h2>
      <p>1.1 DailyVal offers subscription-based services. By subscribing to our service, you agree to pay the fees as described at the time of your subscription.</p>
      <p>1.2 Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can cancel anytime through your iTunes account settings.</p>
      <p>1.3 Payment will be charged to your iTunes Account at confirmation of purchase.</p>
      <p>1.4 Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.</p>
      <p>1.5 Your account will be charged for renewal within 24-hours prior to the end of the current period.</p>
      <p>1.6 You can manage your subscriptions and turn off auto-renewal by going to your Account Settings after purchase.</p>
      <p>1.7 No refund of the current subscription period is available upon cancellation of the subscription.</p>
      <p>1.8 Any unused portion of a free trial period will be forfeited when you purchase a subscription.</p>
      <p>1.9 Prices of subscriptions are subject to change upon notice from DailyVal. Any price changes will take effect at the next subscription renewal date.</p>
      <p>1.10 DailyVal reserves the right to modify, suspend, or discontinue the Service (or any part or content thereof) at any time with or without notice to you, and we will not be liable to you or to any third party for any such modification, suspension, or discontinuation of the Service.</p>
      <p>1.11 In the event that DailyVal chooses to discontinue the app or Service, you acknowledge and agree that you will not be entitled to a refund of any prepaid fees for the current subscription period. Your access to the Service will continue until the end of your current billing cycle, after which the Service will no longer be available.</p>
      <p>1.12 You agree that DailyVal is not required to provide a refund for any reason, and that you will not receive money or other compensation for unused subscription time when the Service is discontinued.</p>
      <p>1.13 DailyVal is not responsible for refunding any charges incurred through your use of the iTunes Store or your mobile carrier. Any refunds or credits for purchases made through the iTunes Store must be requested through Apple, not DailyVal.</p>
      <p>1.14 If technical problems prevent or unreasonably delay delivery of the Service, your exclusive and sole remedy is either replacement of the Service or refund of the subscription price, as determined by DailyVal.</p>
      <p>1.15 By subscribing, you acknowledge that the Service is provided &quot;as is&quot; and that DailyVal makes no warranties regarding the availability, reliability, or continuity of the Service.</p>
      <p>1.16 DailyVal reserves the right to offer promotional trial or discounted subscription periods. These offers are subject to the terms specified at the time of offer. Once the promotional period ends, your subscription will automatically renew at the standard rate unless cancelled prior to the renewal date.</p>

      <h2>Account Termination</h2>
      <p>2.1 You may terminate your account at any time by discontinuing use of our Service or by contacting us.</p>
      <p>2.2 We reserve the right to suspend or terminate your account and your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Service, us, or third parties, or for any other reason.</p>
      <p>2.3 Upon termination, your right to use the Service will immediately cease. If your account is terminated, we may delete any content or other materials relating to your use of the Service and we will have no liability to you or any third party for doing so.</p>
      <p>2.4 Any suspension, termination, or cancellation will not affect your obligations to DailyVal under these Terms of Service (including, without limitation, proprietary rights and ownership, indemnification and limitation of liability), which by their sense and context are intended to survive such suspension, termination, or cancellation.</p>

      <h2>User-Generated Content</h2>
      <p>3.1 Our Service may allow you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material (&quot;User Content&quot;). You are responsible for the User Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>
      <p>3.2 By posting User Content on or through the Service, You represent and warrant that: (i) the User Content is yours (you own it) and/or you have the right to use it and the right to grant us the rights and license as provided in these Terms, and (ii) that the posting of your User Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person or entity.</p>
      <p>3.3 You retain any and all of your rights to any User Content you submit, post or display on or through the Service and you are responsible for protecting those rights. We take no responsibility and assume no liability for User Content you or any third party posts on or through the Service.</p>
      <p>3.4 We reserve the right to remove any User Content from the Service at our discretion, without prior notice, for any reason or no reason, including but not limited to User Content that in our sole judgment violates these Terms, threatens the safety of users of the Service or third parties, or could give rise to liability for DailyVal.</p>

      <h2>Community Data and Automated Access</h2>
      <p>4.1 Ratings, comments, leaderboards, and other community data on the Service are compiled and maintained by DailyVal. They are made available for your personal, non-commercial use through the official DailyVal application and website only.</p>
      <p>4.2 You may not scrape, crawl, harvest, bulk-download, or otherwise systematically extract data from the Service, whether through the website, the application, or any underlying programmatic interface, without Our prior written permission. The Service&apos;s programmatic interfaces exist solely to operate the official application and website, and any other use of them is unauthorized.</p>
      <p>4.3 You may not republish, redistribute, sell, or use data obtained from the Service to build or operate a competing product or dataset. Reasonable quotation of individual results, such as sharing a skin&apos;s rating in a post or video with attribution to DailyVal, is welcome.</p>
      <p>4.4 Search engines may index the public pages of the website in accordance with Our robots.txt directives.</p>
      <p>4.5 We may throttle, block, or terminate access that violates this section, and We reserve all other rights and remedies available to Us.</p>
      <p>4.6 For data partnerships or research access, contact us at <a href="mailto:support@dailyval.com">support@dailyval.com</a>.</p>

      <h2>Contact Us</h2>
      <p>If you have any questions about these Terms and Conditions, You can contact us:</p>
      <ul>
        <li><a href="mailto:support@dailyval.com">support@dailyval.com</a></li>
      </ul>
    </LegalLayout>
  );
}
