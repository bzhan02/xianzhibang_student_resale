"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, SlidersHorizontal, Loader2, PackageOpen } from "lucide-react"
import { getCategory } from "@/lib/categories"
import { useAppStore } from "@/lib/store"
import { ConditionBadge } from "@/components/condition-badge"
import { cn } from "@/lib/utils"
import { SUPABASE_URL, anonHeaders } from "@/lib/supabase-rest"

type SortOption = "newest" | "price-asc" | "price-desc"

type DbItem = {
  id: string
  title: string
  price: number
  original_price: number | null
  images: string[]
  condition: string
  created_at: string
  profiles?: { name: string | null; school: string | null } | null
}

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const category = getCategory(slug)
  const { toggleFavorite, isFavorited } = useAppStore()

  const [items, setItems] = useState<DbItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  useEffect(() => {
    fetch(
      `${SUPABASE_URL}/rest/v1/items?category=eq.${slug}&is_sold=eq.false&select=id,title,price,original_price,images,condition,created_at,profiles!seller_id(name,school)&order=created_at.desc`,
      { headers: anonHeaders() }
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data)
        else {
          // fallback without profiles join
          return fetch(
            `${SUPABASE_URL}/rest/v1/items?category=eq.${slug}&is_sold=eq.false&select=id,title,price,original_price,images,condition,created_at&order=created_at.desc`,
            { headers: anonHeaders() }
          ).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setItems(d) })
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
      .finally(() => setIsLoading(false))
  }, [slug])

  const sortedItems = useMemo(() => {
    const sorted = [...items]
    switch (sortBy) {
      case "price-asc": return sorted.sort((a, b) => a.price - b.price)
      case "price-desc": return sorted.sort((a, b) => b.price - a.price)
      default: return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [items, sortBy])

  if (!category) {
    return <div className="px-4 py-6"><p className="text-muted-foreground">分类不存在</p></div>
  }

  return (
    <div className="px-4 py-4">
      {/* 顶部导航 */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/categories"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground">{category.name}</h1>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">({sortedItems.length} 件)</span>
        )}
      </div>

      {/* 排序栏 */}
      <div className="mb-4 flex items-center gap-2">
        <button type="button"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
          <SlidersHorizontal className="h-3.5 w-3.5" />筛选
        </button>
        {(["newest", "price-asc", "price-desc"] as SortOption[]).map((option) => (
          <button key={option} type="button" onClick={() => setSortBy(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === option
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-accent"
            }`}>
            {option === "newest" && "最新"}
            {option === "price-asc" && "价格低到高"}
            {option === "price-desc" && "价格高到低"}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">这个分类下还没有商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sortedItems.map((item) => {
            const favorited = isFavorited(item.id)
            const discount = item.original_price
              ? Math.round((1 - item.price / item.original_price) * 100) : 0
            return (
              <div key={item.id} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <Link href={`/items/${item.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {item.images?.[0] ? (
                      <Image src={item.images[0]} alt={item.title} fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="50vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片</div>
                    )}
                    <div className="absolute left-2 top-2">
                      <ConditionBadge condition={item.condition as any} />
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/items/${item.id}`}>
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h3>
                  </Link>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-primary">${item.price}</span>
                      {item.original_price && (
                        <span className="text-xs text-muted-foreground line-through">${item.original_price}</span>
                      )}
                    </div>
                    <button type="button"
                      onClick={() => toggleFavorite(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
                      <svg className={cn("h-4 w-4 transition-colors", favorited ? "fill-destructive text-destructive" : "text-muted-foreground")}
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  {item.profiles?.name && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {item.profiles.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">{item.profiles.name}</span>
                      {item.profiles.school && (
                        <><span className="text-xs text-muted-foreground">·</span>
                        <span className="truncate text-xs text-muted-foreground">{item.profiles.school}</span></>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
