"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { Item, ItemCondition, DeliveryMethod, CategorySlug } from "./types"
import { useAuth } from "./auth-context"
import { getToken } from "./utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PAGE_SIZE = 20

type DbItem = {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  images: string[]
  category: string
  condition: string
  delivery_method: string
  location: string | null
  view_count: number
  is_sold: boolean
  created_at: string
  profiles?: { name: string | null; school: string | null; avatar_url: string | null } | null
}

function toItem(row: DbItem): Item {
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

async function fetchItems(offset = 0): Promise<{ items: Item[]; hasMore: boolean }> {
  try {
    const limit = PAGE_SIZE + 1 // 多取一条用于判断是否还有更多
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/items?is_sold=eq.false&select=*,profiles!seller_id(name,school,avatar_url)&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    if (res.ok) {
      const data: DbItem[] = await res.json()
      const hasMore = data.length > PAGE_SIZE
      return { items: data.slice(0, PAGE_SIZE).map(toItem), hasMore }
    }
    // 降级：不 join profiles
    const res2 = await fetch(
      `${SUPABASE_URL}/rest/v1/items?is_sold=eq.false&select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    if (!res2.ok) return { items: [], hasMore: false }
    const data2: DbItem[] = await res2.json()
    const hasMore2 = data2.length > PAGE_SIZE
    return { items: data2.slice(0, PAGE_SIZE).map(toItem), hasMore: hasMore2 }
  } catch {
    return { items: [], hasMore: false }
  }
}

interface AppState {
  items: Item[]
  isLoading: boolean
  hasMore: boolean
  isLoadingMore: boolean
  favoriteIds: Set<string>
  searchQuery: string
  toggleFavorite: (itemId: string) => void
  setSearchQuery: (query: string) => void
  isFavorited: (itemId: string) => boolean
  getFavoriteItems: () => Item[]
  refreshItems: () => Promise<void>
  loadMore: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  const refreshItems = useCallback(async () => {
    setIsLoading(true)
    const result = await fetchItems(0)
    setItems(result.items)
    setHasMore(result.hasMore)
    setIsLoading(false)
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const result = await fetchItems(items.length)
    setItems((prev) => [...prev, ...result.items])
    setHasMore(result.hasMore)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore, items.length])

  useEffect(() => {
    refreshItems()
  }, [refreshItems])

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }
    const token = getToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&select=item_id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data: { item_id: string }[]) => {
        if (Array.isArray(data)) {
          setFavoriteIds(new Set(data.map((d) => d.item_id)))
        }
      })
      .catch(() => {})
  }, [user])

  const toggleFavorite = useCallback(
    (itemId: string) => {
      if (!user) return
      const token = getToken()
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
          fetch(
            `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&item_id=eq.${itemId}`,
            { method: "DELETE", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
          ).catch(() => {})
        } else {
          next.add(itemId)
          fetch(`${SUPABASE_URL}/rest/v1/favorites`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ user_id: user.id, item_id: itemId }),
          }).catch(() => {})
        }
        return next
      })
    },
    [user]
  )

  const isFavorited = useCallback((itemId: string) => favoriteIds.has(itemId), [favoriteIds])
  const getFavoriteItems = useCallback(() => items.filter((item) => favoriteIds.has(item.id)), [items, favoriteIds])

  return (
    <AppContext.Provider value={{
      items, isLoading, hasMore, isLoadingMore,
      favoriteIds, searchQuery,
      toggleFavorite, setSearchQuery, isFavorited, getFavoriteItems,
      refreshItems, loadMore,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useAppStore must be used within an AppProvider")
  return context
}
