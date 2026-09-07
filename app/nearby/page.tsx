"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, MapPin, ChevronDown, ArrowUpDown, Clock, Settings } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { CATEGORIES } from "@/lib/categories"
import { ItemCard } from "@/components/item-card"
import { cn } from "@/lib/utils"
import { findGroup, findSchool, inSameGroup, isSameSchool } from "@/lib/school-groups"

const rangeOptions = ["同校", "同区域", "全部"]
const categoryOptions = ["全部", ...CATEGORIES.map((c) => c.name)]
const priceOptions = ["默认", "价格从低到高", "价格从高到低"]

type FilterKey = "range" | "category" | "price" | "latest"

export default function NearbyPage() {
  const { items } = useAppStore()
  const { profile } = useAuth()
  const userSchool = profile?.school ?? ""

  const [searchQuery, setSearchQuery] = useState("")
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [selectedRange, setSelectedRange] = useState("同区域")
  const [selectedCategory, setSelectedCategory] = useState("全部")
  const [selectedPrice, setSelectedPrice] = useState("默认")
  const [latestFirst, setLatestFirst] = useState(false)

  const userGroup = findGroup(userSchool)
  const userSchoolObj = findSchool(userSchool)

  function toggleFilter(key: FilterKey) {
    if (key === "latest") {
      setLatestFirst((prev) => !prev)
      setOpenFilter(null)
      return
    }
    setOpenFilter(openFilter === key ? null : key)
  }

  const displayItems = useMemo(() => {
    let filtered = [...items]

    // 搜索
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
    }

    // 学校范围筛选
    if (userSchool) {
      if (selectedRange === "同校") {
        filtered = filtered.filter((item) =>
          item.seller?.school ? isSameSchool(userSchool, item.seller.school) : false
        )
      } else if (selectedRange === "同区域") {
        filtered = filtered.filter((item) =>
          item.seller?.school ? inSameGroup(userSchool, item.seller.school) : false
        )
      }
      // "全部" 不过滤
    }

    // 分类筛选
    if (selectedCategory !== "全部") {
      const cat = CATEGORIES.find((c) => c.name === selectedCategory)
      if (cat) filtered = filtered.filter((item) => item.category === cat.slug)
    }

    // 价格排序
    if (selectedPrice === "价格从低到高") {
      filtered.sort((a, b) => a.price - b.price)
    } else if (selectedPrice === "价格从高到低") {
      filtered.sort((a, b) => b.price - a.price)
    }

    // 最新排序（同校商品排前面）
    if (latestFirst) {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } else if (userSchool && selectedRange === "同区域") {
      // 默认：同校的排在前面
      filtered.sort((a, b) => {
        const aIsMySchool = a.seller?.school ? isSameSchool(userSchool, a.seller.school) : false
        const bIsMySchool = b.seller?.school ? isSameSchool(userSchool, b.seller.school) : false
        if (aIsMySchool && !bIsMySchool) return -1
        if (!aIsMySchool && bIsMySchool) return 1
        return 0
      })
    }

    return filtered
  }, [items, searchQuery, selectedRange, selectedCategory, selectedPrice, latestFirst, userSchool])

  const rangeLabel = selectedRange
  const categoryLabel = selectedCategory === "全部" ? "类别" : selectedCategory
  const priceLabel =
    selectedPrice === "默认" ? "价格" : selectedPrice === "价格从低到高" ? "价格↑" : "价格↓"

  // 未设置学校时的提示
  if (!userSchool) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-base font-semibold">设置学校后查看附近好物</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          设置你的学校，即可看到同校及周边学校同学发布的商品
        </p>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <Settings className="h-4 w-4" />
          去设置学校
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* 搜索栏 */}
      <div className="px-4 pt-4 pb-2">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索附近好物..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-input bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </form>
      </div>

      {/* 筛选栏 */}
      <div className="relative px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">

          {/* 范围筛选 */}
          <button
            type="button"
            onClick={() => toggleFilter("range")}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              openFilter === "range" || selectedRange !== "同区域"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground"
            )}
          >
            <MapPin className="h-3 w-3" />
            {rangeLabel}
            <ChevronDown className={cn("h-3 w-3 transition-transform", openFilter === "range" && "rotate-180")} />
          </button>

          {/* 类别 */}
          <button
            type="button"
            onClick={() => toggleFilter("category")}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              openFilter === "category" || selectedCategory !== "全部"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground"
            )}
          >
            {categoryLabel}
            <ChevronDown className={cn("h-3 w-3 transition-transform", openFilter === "category" && "rotate-180")} />
          </button>

          {/* 价格 */}
          <button
            type="button"
            onClick={() => toggleFilter("price")}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              openFilter === "price" || selectedPrice !== "默认"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground"
            )}
          >
            {priceLabel}
            <ArrowUpDown className="h-3 w-3" />
          </button>

          {/* 最新 */}
          <button
            type="button"
            onClick={() => toggleFilter("latest")}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              latestFirst
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground"
            )}
          >
            <Clock className="h-3 w-3" />
            最新发布
          </button>
        </div>

        {/* 下拉面板 */}
        {openFilter === "range" && (
          <DropdownPanel
            options={rangeOptions}
            selected={selectedRange}
            onSelect={(v) => { setSelectedRange(v); setOpenFilter(null) }}
          />
        )}
        {openFilter === "category" && (
          <DropdownPanel
            options={categoryOptions}
            selected={selectedCategory}
            onSelect={(v) => { setSelectedCategory(v); setOpenFilter(null) }}
          />
        )}
        {openFilter === "price" && (
          <DropdownPanel
            options={priceOptions}
            selected={selectedPrice}
            onSelect={(v) => { setSelectedPrice(v); setOpenFilter(null) }}
          />
        )}
      </div>

      {/* 区域信息 */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-xs text-muted-foreground">
          {userSchoolObj
            ? userSchoolObj.displayName
            : userSchool}
          {userGroup && selectedRange !== "同校" && (
            <span className="ml-1 text-primary">· {userGroup.name}</span>
          )}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{displayItems.length} 件</span>
      </div>

      {/* 商品列表 */}
      <div className="px-4 pb-4">
        {displayItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              {selectedRange === "同校" ? "本校暂无商品" : `${userGroup?.name ?? "附近"}暂无商品`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedRange !== "全部"
                ? "试试扩大范围或更换筛选条件"
                : "换个关键词搜索试试"}
            </p>
            {selectedRange === "同校" && (
              <button
                type="button"
                onClick={() => setSelectedRange("同区域")}
                className="mt-3 rounded-full border border-primary px-4 py-1.5 text-xs font-medium text-primary"
              >
                查看{userGroup?.name ?? "附近"}商品
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DropdownPanel({
  options,
  selected,
  onSelect,
}: {
  options: string[]
  selected: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="absolute left-4 right-4 top-full z-30 mt-1 rounded-xl border border-border bg-card p-2 shadow-lg">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selected === opt
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
