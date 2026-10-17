// 動態牆載入中的骨架。純視覺，對輔助科技隱藏。

export default function PostSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="cut animate-pulse border border-border-dim bg-bg-panel/40 p-4"
        >
          <div className="flex items-center gap-2">
            <div className="size-9 bg-bg-elevated" />
            <div className="h-3 w-32 bg-bg-elevated" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full bg-bg-elevated" />
            <div className="h-3 w-4/5 bg-bg-elevated" />
          </div>
          <div className="mt-4 h-4 w-40 bg-bg-elevated" />
        </div>
      ))}
    </div>
  );
}
