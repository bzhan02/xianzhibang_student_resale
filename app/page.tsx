"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Sparkles, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { CATEGORIES } from "@/lib/categories"
import { ItemCard } from "@/components/item-card"
import { CategoryIcon } from "@/components/category-icon"
import { HOT_SEARCHES } from "@/lib/search"

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, isLoading, hasMore, isLoadingMore, refreshItems, loadMore } = useAppStore()
  const legacyQuery = searchParams.get("q") ?? ""

  // 旧链接 /?q=xxx 重定向到新的搜索页
  useEffect(() => {
    if (legacyQuery.trim()) {
      router.replace(`/search?q=${encodeURIComponent(legacyQuery.trim())}`)
    }
  }, [legacyQuery, router])

  useEffect(() => {
    refreshItems()
  }, [refreshItems])

  if (legacyQuery.trim()) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* 分类横向网格 */}
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">分类浏览</h2>
          <Link href="/categories" className="flex items-center gap-0.5 text-xs text-primary">
            查看全部
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/categories/${cat.slug}`} className="flex justify-center">
              <CategoryIcon icon={cat.icon} name={cat.name} size="md" />
            </Link>
          ))}
        </div>
      </section>

      {/* 热门搜索 */}
      <section className="mb-6">
        <div className="mb-2 text-xs font-medium text-muted-foreground">大家都在搜</div>
        <div className="flex flex-wrap gap-1.5">
          {HOT_SEARCHES.map((term, i) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className={
                i < 3
                  ? "rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                  : "rounded-full bg-secondary px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent"
              }
            >
              {term}
            </Link>
          ))}
        </div>
      </section>

      {/* 商品列表 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">推荐好物</h2>
          </div>
          <Link href="/search" className="flex items-center gap-0.5 text-xs text-primary">
            筛选浏览
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-xl bg-secondary" />
                <div className="mt-2 h-3.5 w-4/5 rounded bg-secondary" />
                <div className="mt-1.5 h-3 w-1/3 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    "加载更多"
                  )}
                </button>
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="mt-6 text-center text-xs text-muted-foreground">已显示全部商品</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">暂时没有商品，快来发布吧！</p>
          </div>
        )}
      </section>
    </div>
  )
}
