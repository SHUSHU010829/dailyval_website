import { redirect } from "@/i18n/navigation";

// /ratings 目前直接落到造型排行榜（電競分段上線後仍以 skins 為預設）。
export default async function RatingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/ratings/skins", locale });
}
