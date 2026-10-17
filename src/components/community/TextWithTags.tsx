import { Fragment } from "react";

// 貼文內文：#hashtag 以強調色顯示，其餘照原樣。

const HASHTAG_RE = /(#[\w一-龥぀-ヿ가-힯]+)/g;

export default function TextWithTags({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  // split 帶 capture group 時，奇數索引一定是被捕捉到的 hashtag
  const parts = text.split(HASHTAG_RE);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-medium text-val-red">
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
