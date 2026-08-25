// id 清單分塊（Cloudflare 32KB URI 上限；iOS likeReadChunkSize 的對應）。

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size 必須為正整數");
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
