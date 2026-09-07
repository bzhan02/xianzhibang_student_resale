/**
 * 图片上传。发布页、编辑页、设置页此前各写了一份几乎相同的实现。
 * 路径约定与 003_storage_buckets.sql 里的 RLS 策略对应：
 *   item-images/{user_id}/{item_id}/{index}.{ext}
 *   avatars/{user_id}/avatar.{ext}
 * 第一段目录必须是 user_id，策略靠它判断归属。
 */
import { uploadToStorage, extFromMime } from "./supabase-rest"

/** 商品图。编辑时传 unique 加时间戳，避免浏览器缓存旧图 */
export function uploadItemImage(
  userId: string,
  itemId: string,
  index: number,
  file: File,
  opts: { unique?: boolean } = {}
): Promise<string> {
  const ext = extFromMime(file.type)
  const name = opts.unique ? `${index}_${Date.now()}` : String(index)
  return uploadToStorage("item-images", `${userId}/${itemId}/${name}.${ext}`, file)
}

/** 头像。固定文件名覆盖上传，URL 带时间戳绕过缓存 */
export function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = extFromMime(file.type)
  return uploadToStorage("avatars", `${userId}/avatar.${ext}`, file, {
    upsert: true,
    cacheBust: true,
  })
}
