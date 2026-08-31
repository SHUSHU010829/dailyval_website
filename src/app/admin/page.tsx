// 後台刻意住在 [locale] 之外：它只有一個語系（用它的人就一個），
// 而且不該進 sitemap 或被索引。i18n 的 proxy matcher 也把 /admin 排除掉，
// 否則 /admin 會被導去 /zh-TW/admin。

import type { Metadata } from "next";
import AdminConsole from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "後台",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminConsole />;
}
