"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, GraduationCap } from "lucide-react"
import { ItemCard } from "@/components/item-card"
import { RatingStars, ReviewList } from "@/components/rating-display"
import type { Item } from "@/lib/types"
import { toItem, type ItemRow } from "@/lib/item-mapper"
import { SUPABASE_URL, anonHeaders } from "@/lib/supabase-rest"

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
  school: string | null
  rating: number | null
  review_count: number | null
  items_count: number | null
  created_at: string
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"items" | "reviews">("items")

  useEffect(() => {
    const headers = anonHeaders()
    Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=id,name,avatar_url,school,rating,review_count,items_count,created_at`,
        { headers }
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${SUPABASE_URL}/rest/v1/items?seller_id=eq.${id}&is_sold=eq.false&select=*&order=created_at.desc&limit=30`,
        { headers }
      ).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([profs, rows]) => {
        setProfile(Array.isArray(profs) ? (profs[0] ?? null) : null)
        const p = Array.isArray(profs) ? profs[0] : null
        setItems(
          (Array.isArray(rows) ? rows : []).map((row: ItemRow) =>
            toItem(row, {
              name: p?.name ?? null,
              school: p?.school ?? null,
              avatar_url: p?.avatar_url ?? null,
              rating: p?.rating ?? null,
              items_count: p?.items_count ?? null,
            })
          )
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">找不到这个用户</p>
        <Link href="/" className="text-xs text-primary">
          回到首页
        </Link>
      </div>
    )
  }

  const name = profile.name ?? "用户"
  const rating = profile.rating ?? 0
  const reviewCount = profile.review_count ?? 0

  return (
    <div className="px-4 py-4">
      {/* 返回 */}
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回
      </Link>

      {/* 用户信息 */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{name}</h1>
          {profile.school && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              {profile.school}
            </div>
          )}
          <div className="mt-1.5">
            <RatingStars rating={rating} reviewCount={reviewCount} size="sm" />
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={
            tab === "items"
              ? "rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
              : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          }
        >
          在售 {items.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={
            tab === "reviews"
              ? "rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
              : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          }
        >
          评价 {reviewCount}
        </button>
      </div>

      {tab === "items" ? (
        items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-xs text-muted-foreground">TA 目前没有在售商品</p>
        )
      ) : (
        <ReviewList userId={id} limit={20} />
      )}
    </div>
  )
}
