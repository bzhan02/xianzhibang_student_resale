"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft, Loader2, ShoppingBag, MessageCircle,
  Clock, Truck, CheckCircle2, XCircle, HourglassIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { SUPABASE_URL, authHeaders } from "@/lib/supabase-rest"

type OfferStatus = "pending" | "accepted" | "rejected"

type Purchase = {
  conversation_id: string
  item_id: string
  item_title: string
  item_price: number
  item_images: string[]
  item_is_sold: boolean
  seller_name: string | null
  offer_status: OfferStatus
  delivery_method: string
  preferred_time: string
  rejection_reason?: string
  updated_at: string
}

export default function MyPurchasesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    loadPurchases()
  }, [user])

  async function loadPurchases() {

    // 1. 获取用户作为买家的所有会话，同时关联商品和卖家信息
    const convRes = await fetch(
      `${SUPABASE_URL}/rest/v1/conversations?buyer_id=eq.${user!.id}&select=id,item_id,updated_at,items(id,title,price,images,is_sold),seller:profiles!seller_id(name)&order=updated_at.desc`,
      { headers: authHeaders() }
    )
    if (!convRes.ok) { setIsLoading(false); return }
    const convs = await convRes.json()
    if (!convs.length) { setPurchases([]); setIsLoading(false); return }

    // 2. 每个会话取最新一条 offer 消息获取状态
    const results: Purchase[] = []
    await Promise.all(
      convs.map(async (conv: any) => {
        const msgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conv.id}&message_type=eq.offer&order=created_at.desc&limit=1`,
          { headers: authHeaders() }
        )
        if (!msgRes.ok) return
        const msgs = await msgRes.json()
        const offer = msgs[0]
        if (!offer?.metadata) return // 没有 offer 的会话跳过

        const meta = offer.metadata
        results.push({
          conversation_id: conv.id,
          item_id: conv.items?.id ?? conv.item_id,
          item_title: meta.item_title ?? conv.items?.title ?? "未知商品",
          item_price: meta.item_price ?? conv.items?.price ?? 0,
          item_images: conv.items?.images ?? [],
          item_is_sold: conv.items?.is_sold ?? false,
          seller_name: conv.seller?.name ?? null,
          offer_status: meta.status ?? "pending",
          delivery_method: meta.delivery_method ?? "自取",
          preferred_time: meta.preferred_time ?? "",
          rejection_reason: meta.rejection_reason,
          updated_at: conv.updated_at,
        })
      })
    )

    // 按更新时间排序
    results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    setPurchases(results)
    setIsLoading(false)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="pb-10">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button type="button" onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-base font-semibold">我的购买</h1>
        <span className="text-sm text-muted-foreground">{purchases.length} 条记录</span>
      </div>

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">还没有购买记录</p>
          <p className="text-xs text-muted-foreground">在商品详情页点「我要了」发送购买请求</p>
          <Link href="/" className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            去逛逛
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {purchases.map((p) => (
            <PurchaseCard key={p.conversation_id} purchase={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: OfferStatus }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        已接受
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="h-3 w-3" />
        已拒绝
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600">
      <HourglassIcon className="h-3 w-3" />
      待卖家确认
    </span>
  )
}

function PurchaseCard({ purchase: p }: { purchase: Purchase }) {
  const timeStr = new Date(p.updated_at).toLocaleDateString("zh-CN", {
    month: "numeric", day: "numeric",
  })

  return (
    <div className="px-4 py-4">
      {/* 商品信息行 */}
      <Link href={`/items/${p.item_id}`} className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {p.item_images[0] ? (
            <Image src={p.item_images[0]} alt={p.item_title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">无图</div>
          )}
          {p.item_is_sold && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
              <span className="text-[9px] font-bold text-white">已售出</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{p.item_title}</p>
          <p className="mt-0.5 text-base font-bold text-primary">${p.item_price}</p>
          {p.seller_name && (
            <p className="mt-0.5 text-xs text-muted-foreground">卖家：{p.seller_name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={p.offer_status} />
          <span className="text-xs text-muted-foreground">{timeStr}</span>
        </div>
      </Link>

      {/* 请求详情 */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-secondary px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>{p.delivery_method}</span>
        </div>
        {p.preferred_time && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{p.preferred_time}</span>
          </div>
        )}
      </div>

      {/* 拒绝原因 */}
      {p.offer_status === "rejected" && p.rejection_reason && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
          拒绝原因：{p.rejection_reason}
        </div>
      )}

      {/* 去聊天按钮 */}
      <Link
        href={`/messages/${p.conversation_id}`}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        查看对话
      </Link>
    </div>
  )
}
