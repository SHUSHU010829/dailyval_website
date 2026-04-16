import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

const withNextIntl = createNextIntlPlugin();

const withMDX = createMDX({
  // MDX 選項（remark/rehype plugins 可在此加入）
});

const nextConfig: NextConfig = {
  // 讓 Next.js 也處理 .mdx 檔案
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],

  // Apple App Site Association 需要 application/json Content-Type
  // 否則 iOS 不認識 AASA 檔案
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(withMDX(nextConfig));
