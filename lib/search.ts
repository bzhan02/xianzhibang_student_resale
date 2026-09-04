import type { Item, ItemCondition, DeliveryMethod, CategorySlug } from "./types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const SEARCH_PAGE_SIZE = 24

export type SortOption = "newest" | "price_asc" | "price_desc" | "popular"

export interface SearchFilters {
  q?: string
  category?: CategorySlug | ""
  condition?: ItemCondition | ""
  minPrice?: number | null
  maxPrice?: number | null
  school?: string
  sort?: SortOption
}

export interface SearchResult {
  items: Item[]
  hasMore: boolean
  total: number | null
}

type DbRow = {
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
  profiles?: { name: string | null; school: string | null; avatar_url: string | null } | null
}

function rowToItem(row: DbRow): Item {
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
      name: row.profiles?.name ?? "用户",
      avatar: row.profiles?.avatar_url ?? "",
      school: row.profiles?.school ?? "",
      rating: 0,
      itemsCount: 0,
      joinedDate: row.created_at,
    },
    location: row.location ?? "",
    createdAt: row.created_at,
    isFavorited: false,
    viewCount: row.view_count ?? 0,
  }
}

// PostgREST 的 or=() 里逗号是分隔符、括号是语法字符，需要转义关键词
function escapeForOr(raw: string): string {
  return raw.replace(/[,().*\\"]/g, " ").trim()
}

const SORT_MAP: Record<SortOption, string> = {
  newest: "created_at.desc",
  price_asc: "price.asc",
  price_desc: "price.desc",
  popular: "view_count.desc",
}

function buildQueryString(filters: SearchFilters, offset: number, limit: number): string {
  const params: string[] = []

  params.push("is_sold=eq.false")

  const q = escapeForOr(filters.q ?? "")
  if (q) {
    // 标题或描述模糊匹配（走 pg_trgm GIN 索引）
    params.push(`or=(title.ilike.*${encodeURIComponent(q)}*,description.ilike.*${encodeURIComponent(q)}*)`)
  }

  if (filters.category) params.push(`category=eq.${filters.category}`)
  if (filters.condition) params.push(`condition=eq.${encodeURIComponent(filters.condition)}`)
  if (typeof filters.minPrice === "number" && !Number.isNaN(filters.minPrice)) {
    params.push(`price=gte.${filters.minPrice}`)
  }
  if (typeof filters.maxPrice === "number" && !Number.isNaN(filters.maxPrice)) {
    params.push(`price=lte.${filters.maxPrice}`)
  }

  params.push(`order=${SORT_MAP[filters.sort ?? "newest"]}`)
  params.push(`limit=${limit}`)
  params.push(`offset=${offset}`)

  return params.join("&")
}

/**
 * 服务端搜索：覆盖全库商品，不再局限于已加载的那一页。
 * 多取一条用于判断 hasMore。
 */
export async function searchItems(
  filters: SearchFilters,
  offset = 0,
  pageSize = SEARCH_PAGE_SIZE
): Promise<SearchResult> {
  const limit = pageSize + 1
  const withProfiles = `select=*,profiles!seller_id(name,school,avatar_url)&${buildQueryString(filters, offset, limit)}`

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "count=estimated",
  }

  try {
    let res = await fetch(`${SUPABASE_URL}/rest/v1/items?${withProfiles}`, { headers })

    // 降级：profiles join 失败时退回纯 items 查询
    if (!res.ok) {
      const plain = `select=*&${buildQueryString(filters, offset, limit)}`
      res = await fetch(`${SUPABASE_URL}/rest/v1/items?${plain}`, { headers })
    }
    if (!res.ok) return { items: [], hasMore: false, total: null }

    const rows: DbRow[] = await res.json()
    if (!Array.isArray(rows)) return { items: [], hasMore: false, total: null }

    // Content-Range: 0-23/1234
    const range = res.headers.get("content-range")
    const totalStr = range?.split("/")[1]
    const total = totalStr && totalStr !== "*" ? Number(totalStr) : null

    const hasMore = rows.length > pageSize
    let items = rows.slice(0, pageSize).map(rowToItem)

    // 学校筛选：profiles 是 join 出来的，PostgREST 上做嵌套过滤较麻烦，在客户端兜底
    if (filters.school) {
      items = items.filter((it) => it.seller.school === filters.school)
    }

    return { items, hasMore, total: Number.isFinite(total as number) ? total : null }
  } catch {
    return { items: [], hasMore: false, total: null }
  }
}

/**
 * 输入联想：只取标题，轻量快速。
 */
export async function fetchSuggestions(q: string, limit = 6): Promise<string[]> {
  const term = escapeForOr(q)
  if (!term) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/items?is_sold=eq.false&title=ilike.*${encodeURIComponent(term)}*&select=title&order=view_count.desc&limit=${limit * 3}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    if (!res.ok) return []
    const rows: { title: string }[] = await res.json()
    if (!Array.isArray(rows)) return []
    // 去重
    const seen = new Set<string>()
    const out: string[] = []
    for (const r of rows) {
      const t = (r.title ?? "").trim()
      if (t && !seen.has(t)) {
        seen.add(t)
        out.push(t)
        if (out.length >= limit) break
      }
    }
    return out
  } catch {
    return []
  }
}

/* ---------------- 搜索历史（localStorage） ---------------- */

const HISTORY_KEY = "xzb_search_history"
const HISTORY_MAX = 10

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, HISTORY_MAX) : []
  } catch {
    return []
  }
}

export function addSearchHistory(term: string): string[] {
  if (typeof window === "undefined") return []
  const t = term.trim()
  if (!t) return getSearchHistory()
  try {
    const prev = getSearchHistory().filter((x) => x !== t)
    const next = [t, ...prev].slice(0, HISTORY_MAX)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    return next
  } catch {
    return getSearchHistory()
  }
}

export function removeSearchHistory(term: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const next = getSearchHistory().filter((x) => x !== term)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    return next
  } catch {
    return getSearchHistory()
  }
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* noop */
  }
}

/* ---------------- 热门搜索 ---------------- */

export const HOT_SEARCHES = [
  "教材",
  "自行车",
  "iPad",
  "宿舍床垫",
  "显示器",
  "转租",
  "台灯",
  "行李箱",
]
