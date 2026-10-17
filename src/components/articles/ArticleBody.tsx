import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 文章內文：Markdown → HTML。沒有 rehype-raw，所以內文裡的 HTML 不會被
// 當成 HTML（skipHtml 直接丟掉，而不是印成文字）；連結的協定由 react-markdown
// 的預設白名單把關（http / https / mailto）。同一個元件給公開頁和後台預覽用。
export default function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose-legal prose-article">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          // 圖片來自 R2 或寫手貼的網址，網域不固定；next/image 要登記網域，
          // 這裡用 img，並且一律 lazy。
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
