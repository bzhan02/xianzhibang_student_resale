"use client"

import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from "react"
import type { Item } from "./types"
import { useAuth } from "./auth-context"
import { rest, restOr } from "./supabase-rest"
import { toItem, ITEM_SELECT, type ItemRow } from "./item-mapper"

const PAGE_SIZE = 20

async function fetchItems(offset = 0): Promise<{ items: Item[]; hasMore: boolean }> {
  // 多取一条用于判断是否还有更多
  const limit = PAGE_SIZE + 1
  const query = `is_sold=eq.false&order=created_at.desc&limit=${limit}&offset=${offset}`

  let rows = await restOr<ItemRow[]>(`items?select=${ITEM_SELECT}&${query}`, [])
  // profiles join 失败时降级为纯 items
  if (rows.length === 0) rows = await restOr<ItemRow[]>(`items?select=*&${query}`, [])

  return { items: rows.slice(0, PAGE_SIZE).map((r) => toItem(r)), hasMore: rows.length > PAGE_SIZE }
}

interface AppState {
  items: Item[]
  isLoading: boolean
  hasMore: boolean
  isLoadingMore: boolean
  favoriteIds: Set<string>
  toggleFavorite: (itemId: string) => void
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

  const refreshItems = useCallback(async () => {
    setIsLoading(true)
    const { items, hasMore } = await fetchItems(0)
    setItems(items)
    setHasMore(hasMore)
    setIsLoading(false)
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const res = await fetchItems(items.length)
    setItems((prev) => [...prev, ...res.items])
    setHasMore(res.hasMore)
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
    restOr<{ item_id: string }[]>(`favorites?user_id=eq.${user.id}&select=item_id`, [], { auth: true })
      .then((rows) => setFavoriteIds(new Set(rows.map((r) => r.item_id))))
  }, [user])

  const toggleFavorite = useCallback(
    (itemId: string) => {
      if (!user) return
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
          rest(`favorites?user_id=eq.${user.id}&item_id=eq.${itemId}`, {
            method: "DELETE", auth: true,
          }).catch(() => {})
        } else {
          next.add(itemId)
          rest("favorites", {
            method: "POST", auth: true, prefer: "return=minimal",
            body: { user_id: user.id, item_id: itemId },
          }).catch(() => {})
        }
        return next
      })
    },
    [user]
  )

  const isFavorited = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])
  const getFavoriteItems = useCallback(
    () => items.filter((i) => favoriteIds.has(i.id)),
    [items, favoriteIds]
  )

  return (
    <AppContext.Provider
      value={{
        items, isLoading, hasMore, isLoadingMore, favoriteIds,
        toggleFavorite, isFavorited, getFavoriteItems, refreshItems, loadMore,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useAppStore must be used within an AppProvider")
  return ctx
}
