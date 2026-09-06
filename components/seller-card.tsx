"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, ChevronRight } from "lucide-react"
import type { User } from "@/lib/types"
import { RatingStars } from "./rating-display"
import { fetchRatingSummary, type RatingSummary } from "@/lib/reviews"

export function SellerCard({
  seller,
  location,
}: {
  seller: User
  location: string
}) {
  const [summary, setSummary] = useState<RatingSummary>({
    rating: seller.rating ?? 0,
    reviewCount: 0,
  })

  useEffect(() => {
    if (!seller.id) return
    let alive = true
    fetchRatingSummary(seller.id).then((s) => {
      if (alive) setSummary(s)
    })
    return () => {
      alive = false
    }
  }, [seller.id])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      {seller.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={seller.avatar}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {seller.name.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-card-foreground">{seller.name}</span>
          <RatingStars rating={summary.rating} reviewCount={summary.reviewCount} size="xs" />
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{seller.school}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{location}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-xs text-muted-foreground">
          在售 {seller.itemsCount} 件
        </div>
        {summary.reviewCount > 0 && (
          <Link
            href={`/users/${seller.id}`}
            className="mt-1 flex items-center justify-end gap-0.5 text-xs text-primary"
          >
            看评价
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
