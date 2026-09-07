"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Plus, Loader2, PackageX, Pencil, Heart, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ConditionBadge } from "@/components/condition-badge"
import { toast } from "sonner"
import { getToken } from "@/lib/utils"
import { SUPABASE_URL, SUPABASE_ANON_KEY, authHeaders } from "@/lib/supabase-rest"

type MyItem = {
  id: string
  title: string
  price: number
  images: string[]
  condition: string
  is_sold: boolean
  view_count: number
  created_at: string
}

export default function MyListingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<MyItem[]>([])
  const [favCounts, setFavCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const token = getToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/items?seller_id=eq.${user.id}&select=id,title,price,images,condition,is_sold,view_count,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((r) => r.json())
      .then(async (data) => {
        const list: MyItem[] = Array.isArray(data) ? data : []
        setItems(list)
        // 批量拉取每件商品的收藏数
        if (list.length > 0) {
          const ids = list.map((i) => i.id).join(",")
          const favRes = await fetch(
            `${SUPABASE_URL}/rest/v1/favorites?item_id=in.(${ids})&select=item_id`,
            { headers: authHeaders() }
          )
          if (favRes.ok) {
            const favData: { item_id: string }[] = await favRes.json()
            const counts: Record<string, number> = {}
            for (const f of favData) {
              counts[f.item_id] = (counts[f.item_id] ?? 0) + 1
            }
            setFavCounts(counts)
          }
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [user])

  async function markAsSold(itemId: string, currentlySold: boolean) {
    const token = getToken()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${itemId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ is_sold: !currentlySold }),
    })
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, is_sold: !currentlySold } : item
        )
      )
      toast.success(currentlySold ? "已标记为在售" : "已标记为已售出")
    } else {
      toast.error("操作失败，请重试")
    }
  }

  async function deleteItem(itemId: string) {
    const token = getToken()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${itemId}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== itemId))
      toast.success("商品已删除")
    } else {
      toast.error("删除失败，请重试")
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button type="button" onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-base font-semibold">我的发布</h1>
        <Link href="/publish"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <PackageX className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">还没有发布任何商品</p>
          <Link href="/publish"
            className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
            去发布
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 px-4 py-4">
              {/* 图片 */}
              <Link href={`/items/${item.id}`} className="shrink-0">
                <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                  {item.images?.[0] ? (
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">暂无图片</div>
                  )}
                </div>
              </Link>

              {/* 信息 */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/items/${item.id}`}>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-bold text-primary">${item.price}</span>
                    <ConditionBadge condition={item.condition as any} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${item.is_sold ? "text-muted-foreground" : "text-green-600"}`}>
                      {item.is_sold ? "已售出" : "在售中"}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />{item.view_count}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" />{favCounts[item.id] ?? 0}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/items/${item.id}/edit`}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      <Pencil className="h-3 w-3" />
                      编辑
                    </Link>
                    <button
                      type="button"
                      onClick={() => markAsSold(item.id, item.is_sold)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      {item.is_sold ? "标记在售" : "标记售出"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("确定要删除这件商品吗？")) deleteItem(item.id)
                      }}
                      className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
