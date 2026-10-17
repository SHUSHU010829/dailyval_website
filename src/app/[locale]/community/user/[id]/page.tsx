import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AuthorPage from "@/components/community/AuthorPage";
import { isUUID } from "@/lib/community/mapping";
import { fetchAuthorProfile } from "@/lib/community/reads";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 60;

interface UserPageParams {
  locale: string;
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<UserPageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "meta.communityUser" });
  const profile = await fetchAuthorProfile(id);
  const name = profile?.displayName;

  if (!name) {
    return {
      ...buildMetadata({
        locale,
        title: t("notFoundTitle"),
        description: t("description", { name: "" }),
        path: `/community/user/${id}`,
      }),
      robots: { index: false, follow: true },
    };
  }

  return buildMetadata({
    locale,
    title: t("title", { name }),
    description: t("description", { name }),
    path: `/community/user/${id}`,
  });
}

export default async function CommunityUserPage({
  params,
}: {
  params: Promise<UserPageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 舊版的路徑參數是 CloudKit 的 record name，不是帳號 id
  if (!isUUID(id)) notFound();

  const profile = await fetchAuthorProfile(id);

  return <AuthorPage authorId={id} profile={profile} />;
}
