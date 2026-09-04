"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, SlidersHorizontal, X, ChevronDown, Search as SearchIcon } from "lucide-react"
import { ItemCard } from "@/components/item-card"
import { categories } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type { Item, ItemCondition, CategorySlug } from "@/lib/types"
import {
  searchItems,
  addSearchHistory,
  SEARCH_PAGE_SIZE,
  type SortOption,
  type SearchFilters,
} from "@/lib/search"

const CONDITIONS: ItemCondition[] = ["全新", "仅拆封", "轻微使用", "明显使用"]

const SORTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "popular", label: "最多浏览" },
]

const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "不限", min: null, max: null },
  { label: "$0-25", min: 0, max: 25 },
  { label: "$25-50", min: 25, max: 50 },
  { label: "$50-100", min: 50, max: 100 },
  { label: "$100-300", min: 100, max: 300 },
  { label: "$300+", min: 300, max: null },
]

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const router = useRouter()
  const params = useSearchParams()

  const q = params.get("q") ?? ""
  const category = (params.get("category") ?? "") as CategorySlug | ""
  const condition = (params.get("condition") ?? "") as ItemCondition | ""
  const sort = (params.get("sort") ?? "newest") as SortOption
  const minPrice = params.get("min") ? Number(params.get("min")) : null
  const maxPrice = params.get("max") ? Number(params.get("max")) : null

  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [openPanel, setOpenPanel] = useState<"category" | "price" | "condition" | "sort" | null>(null)

  const reqId = useRef(0)

  const filters: SearchFilters = useMemo(
    () => ({ q, category, condition, minPrice, maxPrice, sort }),
    [q, category, condition, minPrice, maxPrice, sort]
  )

  // 拉取第一页
  useEffect(() => {
    const id = ++reqId.current
    setIsLoading(true)
    setOpenPanel(null)
    searchItems(filters, 0).then((res) => {
      if (id !== reqId.current) return // 丢弃过期请求
      setItems(res.items)
      setHasMore(res.hasMore)
      setTotal(res.total)
      setIsLoading(false)
    })
  }, [filters])

  // 记录搜索历史
  useEffect(() => {
    if (q.trim()) addSearchHistory(q)
  }, [q])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const res = await searchItems(filters, items.length)
    setItems((prev) => [...prev, ...res.items])
    setHasMore(res.hasMore)
    setIsLoadingMore(false)
  }, [filters, items.length, hasMore, isLoadingMore])

  // 更新 URL 参数（保持可分享、可后退）
  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k)
        else next.set(k, v)
      }
      router.replace(`/search?${next.toString()}`)
      setOpenPanel(null)
    },
    [params, router]
  )

  const activeFilterCount =
    (category ? 1 : 0) + (condition ? 1 : 0) + (minPrice !== null || maxPrice !== null ? 1 : 0)

  const priceLabel =
    minPrice === null && maxPrice === null
      ? "价格"
      : maxPrice === null
        ? `$${minPrice}+`
        : `$${minPrice ?? 0}-${maxPrice}`

  const categoryLabel = category ? (categories.find((c) => c.slug === category)?.name ?? "分类") : "分类"
  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "最新发布"

  return (
    <div className="px-4 py-4">
      {/* 顶部：查询词 + 结果数 */}
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h1 className="text-base font-semibold text-foreground">
          {q ? <>搜索 &ldquo;{q}&rdquo;</> : "全部商品"}
        </h1>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {total !== null ? `约 ${total} 件` : `${items.length} 件`}
          </span>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="relative mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterChip
            label={categoryLabel}
            active={!!category}
            open={openPanel === "category"}
            onClick={() => setOpenPanel(openPanel === "category" ? null : "category")}
          />
          <FilterChip
            label={priceLabel}
            active={minPrice !== null || maxPrice !== null}
            open={openPanel === "price"}
            onClick={() => setOpenPanel(openPanel === "price" ? null : "price")}
          />
          <FilterChip
            label={condition || "成色"}
            active={!!condition}
            open={openPanel === "condition"}
            onClick={() => setOpenPanel(openPanel === "condition" ? null : "condition")}
          />
          <FilterChip
            label={sortLabel}
            active={sort !== "newest"}
            open={openPanel === "sort"}
            icon={<SlidersHorizontal className="h-3 w-3" />}
            onClick={() => setOpenPanel(openPanel === "sort" ? null : "sort")}
          />
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setParam({ category: null, condition: null, min: null, max: null })}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              清除 {activeFilterCount}
            </button>
          )}
        </div>

        {/* 下拉面板 */}
        {openPanel && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenPanel(null)} />
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-border bg-card p-3 shadow-lg">
              {openPanel === "category" && (
                <div className="flex flex-wrap gap-2">
                  <OptionPill label="全部" active={!category} onClick={() => setParam({ category: null })} />
                  {categories.map((c) => (
                    <OptionPill
                      key={c.slug}
                      label={c.name}
                      active={category === c.slug}
                      onClick={() => setParam({ category: c.slug })}
                    />
                  ))}
                </div>
              )}
              {openPanel === "price" && (
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((p) => (
                    <OptionPill
                      key={p.label}
                      label={p.label}
                      active={minPrice === p.min && maxPrice === p.max}
                      onClick={() =>
                        setParam({
                          min: p.min === null ? null : String(p.min),
                          max: p.max === null ? null : String(p.max),
                        })
                      }
                    />
                  ))}
                </div>
              )}
              {openPanel === "condition" && (
                <div className="flex flex-wrap gap-2">
                  <OptionPill label="不限" active={!condition} onClick={() => setParam({ condition: null })} />
                  {CONDITIONS.map((c) => (
                    <OptionPill
                      key={c}
                      label={c}
                      active={condition === c}
                      onClick={() => setParam({ condition: c })}
                    />
                  ))}
                </div>
              )}
              {openPanel === "sort" && (
                <div className="flex flex-col gap-1">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setParam({ sort: s.value === "newest" ? null : s.value })}
                      className={cn(
                        "rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        sort === s.value ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-accent"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 结果 */}
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
          {!hasMore && items.length > SEARCH_PAGE_SIZE && (
            <p className="mt-6 text-center text-xs text-muted-foreground">已显示全部结果</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <SearchIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">没有找到相关商品</p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount > 0 ? "试试放宽筛选条件，或换个关键词" : "换个关键词试试吧"}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setParam({ category: null, condition: null, min: null, max: null })}
              className="mt-1 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-accent"
            >
              清除全部筛选
            </button>
          )}
          <Link href="/" className="mt-1 text-xs text-primary">
            回到首页浏览
          </Link>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  open,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  open: boolean
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active || open ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
      )}
    >
      {icon}
      {label}
      <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
    </button>
  )
}

function OptionPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active ? "border-primary bg-primary/10 font-medium text-primary" : "border-border bg-card text-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  )
}
