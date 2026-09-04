"use client"

import { Suspense, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Sparkles, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { categories } from "@/lib/mock-data"
import { ItemCard } from "@/components/item-card"
import { CategoryIcon } from "@/components/category-icon"

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const { items, isLoading, hasMore, isLoadingMore, refreshItems, loadMore } = useAppStore()
  const query = searchParams.get("q") || ""

  useEffect(() => {
    refreshItems()
  }, [refreshItems])

  const displayItems = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [query, items])

  return (
    <div className="px-4 py-4">
      {/* 分类横向网格 */}
      {!query && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">分类浏览</h2>
            <Link href="/categories" className="flex items-center gap-0.5 text-xs text-primary">
              查看全部
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categories/${cat.slug}`} className="flex justify-center">
                <CategoryIcon icon={cat.icon} name={cat.name} size="md" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 商品列表 */}
      <section>
        <div className="mb-3 flex items-center gap-1.5">
          {query ? (
            <h2 className="text-base font-semibold text-foreground">
              {"搜索结果: \""}{query}{"\""}
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({displayItems.length} 件)
                </span>
              )}
            </h2>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">推荐好物</h2>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {/* 加载更多（仅无搜索词时显示） */}
            {!query && hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {isLoadingMore ? <><Loader2 className="h-4 w-4 animate-spin" />加载中...</> : "加载更多"}
                </button>
              </div>
            )}
            {!query && !hasMore && items.length > 0 && (
              <p className="mt-6 text-center text-xs text-muted-foreground">已显示全部商品</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? "没有找到相关商品，换个关键词试试吧" : "暂时没有商品，快来发布吧！"}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
