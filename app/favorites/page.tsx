"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useAppStore } from "@/lib/store"
import { ConditionBadge } from "@/components/condition-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { SUPABASE_URL, authHeaders } from "@/lib/supabase-rest"

type FavItem = {
  id: string
  title: string
  price: number
  images: string[]
  condition: string
  is_sold: boolean
}

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { toggleFavorite, isFavorited } = useAppStore()
  const [items, setItems] = useState<FavItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setIsLoading(false); return }

    // 先拿所有收藏的 item_id
    fetch(
      `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&select=item_id&order=created_at.desc`,
      { headers: authHeaders() }
    )
      .then((r) => r.json())
      .then(async (favs: { item_id: string }[]) => {
        if (!Array.isArray(favs) || favs.length === 0) {
          setItems([])
          setIsLoading(false)
          return
        }
        const ids = favs.map((f) => f.item_id).join(",")
        // 批量拉取商品信息
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/items?id=in.(${ids})&select=id,title,price,images,condition,is_sold`,
          { headers: authHeaders() }
        )
        if (res.ok) {
          const data: FavItem[] = await res.json()
          // 按收藏顺序排列
          const order = favs.map((f) => f.item_id)
          data.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
          setItems(data)
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [user, authLoading])

  function handleUnfavorite(itemId: string) {
    toggleFavorite(itemId)
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    toast("已取消收藏")
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <Heart className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">登录后才能查看收藏</p>
        <Link href="/auth">
          <Button className="rounded-full">去登录</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">我的收藏</h1>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">{items.length} 件商品</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">还没有收藏任何商品</p>
          <p className="text-xs text-muted-foreground">浏览商品时点击心形图标即可收藏</p>
          <Link href="/">
            <Button variant="outline" className="rounded-full">去逛逛</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Link href={`/items/${item.id}`} className="block">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {item.images?.[0] ? (
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" sizes="50vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片</div>
                  )}
                  {item.is_sold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">已售出</span>
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <ConditionBadge condition={item.condition as any} />
                  </div>
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/items/${item.id}`}>
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground">
                    {item.title}
                  </h3>
                </Link>
                <div className="mt-2 flex items-end justify-between">
                  <span className={cn("text-lg font-bold", item.is_sold ? "text-muted-foreground" : "text-primary")}>
                    ${item.price}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnfavorite(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
                    aria-label="取消收藏"
                  >
                    <Heart className="h-4 w-4 fill-destructive text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
