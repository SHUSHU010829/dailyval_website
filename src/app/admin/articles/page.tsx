// 文章後台：寫手在這裡寫遊戲話題的文章，網站 /articles 與 App 的話題頁共讀。
// 跟 /admin 一樣住在 [locale] 之外、不進 sitemap、不被索引；權限由
// /api/admin/articles/* 的伺服器端決定。

import type { Metadata } from "next";
import ArticlesConsole from "@/components/admin/articles/ArticlesConsole";

export const metadata: Metadata = {
  title: "文章後台",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ArticlesAdminPage() {
  return <ArticlesConsole />;
}
