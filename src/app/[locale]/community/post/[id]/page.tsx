import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PostDetail from "@/components/community/PostDetail";
import { isUUID } from "@/lib/community/mapping";
import { communityOgPath } from "@/lib/community/og";
import { fetchPostDetail } from "@/lib/community/reads";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 30;

interface PostPageParams {
  locale: string;
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PostPageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "meta.communityPost" });
  const post = await fetchPostDetail(id);

  if (!post) {
    return {
      ...buildMetadata({
        locale,
        title: t("notFoundTitle"),
        description: t("description"),
        path: `/community/post/${id}`,
      }),
      robots: { index: false, follow: true },
    };
  }

  const meta = buildMetadata({
    locale,
    title: t("title", { name: post.author.name }),
    description: post.body.slice(0, 160) || t("description"),
    path: `/community/post/${id}`,
    ogImage: communityOgPath(id, locale),
  });

  // 貼文是文章型內容：覆寫 openGraph 類型並帶上發表時間與作者
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.createdAt,
      authors: [post.author.name],
    },
  };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<PostPageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 貼文 id 是 uuid；不是的路徑沒有對應的列，直接 404
  if (!isUUID(id)) notFound();

  // 匿名視角的貼文先在伺服器端備好：爬蟲看得到內文，首繪不必等 API；
  // 登入者的反應狀態由瀏覽器端再讀一次補上
  const initialPost = await fetchPostDetail(id);

  return <PostDetail postId={id} initialPost={initialPost} />;
}
