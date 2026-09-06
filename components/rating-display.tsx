"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchReviewsFor, type Review } from "@/lib/reviews"

/** 星级 + 评分数字。无评价时显示"暂无评价"而不是假 5 星 */
export function RatingStars({
  rating,
  reviewCount,
  size = "sm",
  showCount = true,
  className,
}: {
  rating: number
  reviewCount: number
  size?: "xs" | "sm" | "md"
  showCount?: boolean
  className?: string
}) {
  const starSize = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"
  const textSize = size === "xs" ? "text-[11px]" : size === "md" ? "text-sm" : "text-xs"

  if (!reviewCount || reviewCount < 1) {
    return (
      <span className={cn("text-muted-foreground", textSize, className)}>暂无评价</span>
    )
  }

  return (
    <span className={cn("flex items-center gap-1", className)}>
      <span className="flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i < Math.round(rating) ? "fill-current" : "text-muted-foreground/25"
            )}
          />
        ))}
      </span>
      <span className={cn("font-medium text-foreground", textSize)}>{rating.toFixed(1)}</span>
      {showCount && (
        <span className={cn("text-muted-foreground", textSize)}>({reviewCount})</span>
      )}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1) return "今天"
  if (d < 7) return `${d} 天前`
  if (d < 30) return `${Math.floor(d / 7)} 周前`
  if (d < 365) return `${Math.floor(d / 30)} 个月前`
  return `${Math.floor(d / 365)} 年前`
}

/** 某人收到的评价列表 */
export function ReviewList({ userId, limit = 10 }: { userId: string; limit?: number }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchReviewsFor(userId, limit).then((r) => {
      if (!alive) return
      setReviews(r)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [userId, limit])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border p-3.5">
            <div className="h-3 w-24 rounded bg-secondary" />
            <div className="mt-2 h-3 w-4/5 rounded bg-secondary" />
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center">
        <Star className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">还没有收到评价</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">完成一笔交易后，对方就能评价你</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-2.5">
            {/* 头像 */}
            {r.reviewer?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.reviewer.avatar}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(r.reviewer?.name ?? "用").charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-foreground">
                  {r.reviewer?.name ?? "用户"}
                </span>
                <span className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < r.rating ? "fill-current" : "text-muted-foreground/25"
                      )}
                    />
                  ))}
                </span>
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {r.reviewerRole === "buyer" ? "买家" : "卖家"}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {timeAgo(r.createdAt)}
                </span>
              </div>

              {r.comment && (
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {r.comment}
                </p>
              )}
              {r.item?.title && (
                <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                  交易商品：{r.item.title}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
