import type { Item, ItemCondition, CategorySlug } from "./types"
import { SUPABASE_URL, anonHeaders } from "./supabase-rest"
import { toItem, ITEM_SELECT, type ItemRow } from "./item-mapper"

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

// PostgREST 的 or=() 里逗号是分隔符、括号是语法字符，需要剔除
function sanitize(raw: string): string {
  return raw.replace(/[,().*\\"]/g, " ").trim()
}

const SORT_MAP: Record<SortOption, string> = {
  newest: "created_at.desc",
  price_asc: "price.asc",
  price_desc: "price.desc",
  popular: "view_count.desc",
}

function buildQuery(f: SearchFilters, offset: number, limit: number): string {
  const params = ["is_sold=eq.false"]

  const q = sanitize(f.q ?? "")
  if (q) {
    const e = encodeURIComponent(q)
    // 标题或描述模糊匹配，走 pg_trgm GIN 索引（见 004_search_indexes.sql）
    params.push(`or=(title.ilike.*${e}*,description.ilike.*${e}*)`)
  }
  if (f.category) params.push(`category=eq.${f.category}`)
  if (f.condition) params.push(`condition=eq.${encodeURIComponent(f.condition)}`)
  if (typeof f.minPrice === "number" && !Number.isNaN(f.minPrice)) params.push(`price=gte.${f.minPrice}`)
  if (typeof f.maxPrice === "number" && !Number.isNaN(f.maxPrice)) params.push(`price=lte.${f.maxPrice}`)

  params.push(`order=${SORT_MAP[f.sort ?? "newest"]}`, `limit=${limit}`, `offset=${offset}`)
  return params.join("&")
}

/** 服务端搜索：覆盖全库，不局限于已加载的那一页 */
export async function searchItems(
  filters: SearchFilters,
  offset = 0,
  pageSize = SEARCH_PAGE_SIZE
): Promise<SearchResult> {
  // 多取一条用于判断 hasMore
  const limit = pageSize + 1
  const query = buildQuery(filters, offset, limit)
  const headers = anonHeaders({ Prefer: "count=estimated" })

  try {
    let res = await fetch(`${SUPABASE_URL}/rest/v1/items?select=${ITEM_SELECT}&${query}`, { headers })
    // profiles join 失败时退回纯 items 查询
    if (!res.ok) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/items?select=*&${query}`, { headers })
    }
    if (!res.ok) return { items: [], hasMore: false, total: null }

    const rows: ItemRow[] = await res.json()
    if (!Array.isArray(rows)) return { items: [], hasMore: false, total: null }

    // Content-Range 形如 "0-23/1234"
    const totalStr = res.headers.get("content-range")?.split("/")[1]
    const total = totalStr && totalStr !== "*" ? Number(totalStr) : null

    let items = rows.slice(0, pageSize).map((r) => toItem(r))
    // profiles 是 join 出来的，嵌套过滤在 PostgREST 上较绕，学校筛选放客户端兜底
    if (filters.school) items = items.filter((i) => i.seller.school === filters.school)

    return {
      items,
      hasMore: rows.length > pageSize,
      total: Number.isFinite(total as number) ? total : null,
    }
  } catch {
    return { items: [], hasMore: false, total: null }
  }
}

/** 输入联想：只取标题，轻量快速 */
export async function fetchSuggestions(q: string, limit = 6): Promise<string[]> {
  const term = sanitize(q)
  if (!term) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/items?is_sold=eq.false&title=ilike.*${encodeURIComponent(term)}*` +
        `&select=title&order=view_count.desc&limit=${limit * 3}`,
      { headers: anonHeaders() }
    )
    if (!res.ok) return []
    const rows: { title: string }[] = await res.json()
    if (!Array.isArray(rows)) return []

    // 同名商品会重复，去重后再截断
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

function readHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, HISTORY_MAX) : []
  } catch {
    return []
  }
}

function writeHistory(list: string[]): string[] {
  if (typeof window === "undefined") return []
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    /* 隐私模式下 localStorage 会抛错，忽略即可 */
  }
  return list
}

export const getSearchHistory = readHistory

export function addSearchHistory(term: string): string[] {
  const t = term.trim()
  if (!t) return readHistory()
  return writeHistory([t, ...readHistory().filter((x) => x !== t)].slice(0, HISTORY_MAX))
}

export function removeSearchHistory(term: string): string[] {
  return writeHistory(readHistory().filter((x) => x !== term))
}

export function clearSearchHistory(): void {
  writeHistory([])
}

/* ---------------- 热门搜索 ---------------- */

export const HOT_SEARCHES = [
  "教材", "自行车", "iPad", "宿舍床垫",
  "显示器", "转租", "台灯", "行李箱",
]
