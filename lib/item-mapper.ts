/**
 * 数据库行 → Item 的唯一映射。
 * 此前 lib/store.tsx、lib/search.ts、app/users/[id]/page.tsx 各写了一份，
 * 加字段时容易漏改其中一处（avatar_url 就漏过）。
 */
import type { Item, ItemCondition, DeliveryMethod, CategorySlug } from "./types"

/** items 表连带 profiles 的查询结果 */
export interface ItemRow {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  images: string[] | null
  category: string
  condition: string
  delivery_method: string
  location: string | null
  view_count: number | null
  is_sold: boolean
  created_at: string
  profiles?: {
    name: string | null
    school: string | null
    avatar_url?: string | null
    rating?: number | null
    items_count?: number | null
  } | null
}

/** 商品列表都需要的 select 子句，保证各处取到的字段一致 */
export const ITEM_SELECT = "*,profiles!seller_id(name,school,avatar_url)"

/**
 * @param row  数据库行
 * @param sellerOverride 卖家主页场景下 profiles 未 join，用外部已知的卖家信息补齐
 */
export function toItem(row: ItemRow, sellerOverride?: ItemRow["profiles"]): Item {
  const p = row.profiles ?? sellerOverride ?? null
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    images: row.images ?? [],
    category: row.category as CategorySlug,
    condition: row.condition as ItemCondition,
    deliveryMethod: row.delivery_method as DeliveryMethod,
    seller: {
      id: row.seller_id,
      name: p?.name ?? "用户",
      avatar: p?.avatar_url ?? "",
      school: p?.school ?? "",
      rating: p?.rating ?? 0,
      itemsCount: p?.items_count ?? 0,
      joinedDate: row.created_at,
    },
    location: row.location ?? "",
    createdAt: row.created_at,
    isFavorited: false,
    viewCount: row.view_count ?? 0,
  }
}
