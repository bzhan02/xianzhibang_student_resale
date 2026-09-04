"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { ConditionBadge } from "./condition-badge"
import type { Item } from "@/lib/types"

export function ItemCard({ item, showDistance = false }: { item: Item; showDistance?: boolean }) {
  const { toggleFavorite, isFavorited } = useAppStore()
  const favorited = isFavorited(item.id)

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/items/${item.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {item.images?.[0] ? (
            <Image
              src={item.images[0]}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片</div>
          )}
          <div className="absolute left-2 top-2">
            <ConditionBadge condition={item.condition} />
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
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-primary">${item.price}</span>
            {item.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">${item.originalPrice}</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggleFavorite(item.id) }}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
            aria-label={favorited ? "取消收藏" : "收藏"}
          >
            <Heart className={cn("h-4 w-4 transition-colors", favorited ? "fill-destructive text-destructive" : "text-muted-foreground")} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {/* 头像：有图片则显示，否则首字母 */}
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
            {item.seller?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.seller.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-bold text-primary">
                {(item.seller?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {item.seller?.name || "用户"}
          </span>
          {item.seller?.school && (
            <>
              <span className="shrink-0 text-xs text-muted-foreground">·</span>
              <span className="truncate text-xs text-muted-foreground">{item.seller.school}</span>
            </>
          )}
        </div>
        {showDistance && item.distance && (
          <div className="mt-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="text-xs text-gray-400">距你 {item.distance}</span>
          </div>
        )}
      </div>
    </div>
  )
}
