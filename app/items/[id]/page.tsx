"use client"
import { use, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Heart, MessageCircle, MessageSquare,
  Share2, Eye, Clock, MapPin, Truck, Loader2,
  ChevronLeft, ChevronRight, QrCode,
} from "lucide-react"
import { ConditionBadge } from "@/components/condition-badge"
import { cn, getToken } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useAppStore } from "@/lib/store"
import { SUPABASE_URL, SUPABASE_ANON_KEY, anonHeaders, authHeaders } from "@/lib/supabase-rest"

type Item = {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  original_price: number | null
  images: string[]
  category: string
  condition: string
  delivery_method: string
  location: string
  view_count: number
  is_sold: boolean
  created_at: string
  profiles: { name: string | null; school: string | null } | null
}

async function fetchItem(id: string): Promise<Item | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/items?id=eq.${id}&select=*,profiles!seller_id(name,school)&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (res.ok) {
    const data = await res.json()
    if (data[0]) return data[0]
  }
  const res2 = await fetch(
    `${SUPABASE_URL}/rest/v1/items?id=eq.${id}&select=*&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res2.ok) return null
  const data2 = await res2.json()
  if (!data2[0]) return null
  return { ...data2[0], profiles: null }
}

async function fetchRecommended(category: string, excludeId: string): Promise<Item[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/items?category=eq.${category}&id=neq.${excludeId}&is_sold=eq.false&select=*&limit=4`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.map((item: Item) => ({ ...item, profiles: null }))
}

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { toggleFavorite, isFavorited } = useAppStore()
  const favorited = isFavorited(id)
  const [item, setItem] = useState<Item | null>(null)
  const [recommended, setRecommended] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChatting, setIsChatting] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showWechatModal, setShowWechatModal] = useState(false)
  const [offerDelivery, setOfferDelivery] = useState<"自取" | "邮寄" | "均可">("自取")
  const [offerTime, setOfferTime] = useState("")
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  const didIncrement = useRef(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  async function getOrCreateConversation(): Promise<string | null> {
    const token = getToken()
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/conversations?item_id=eq.${id}&buyer_id=eq.${user!.id}&select=id&limit=1`,
      { headers: authHeaders() }
    ).then((r) => r.json())
    if (existing?.[0]?.id) return existing[0].id
    const res = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ item_id: id, buyer_id: user!.id, seller_id: item!.seller_id }),
    })
    if (!res.ok) return null
    const [conv] = await res.json()
    return conv.id
  }

  async function startChat() {
    if (!user) { router.push("/auth"); return }
    if (!item) return
    if (user.id === item.seller_id) { toast.error("不能给自己发消息"); return }
    setIsChatting(true)
    try {
      const convId = await getOrCreateConversation()
      if (!convId) throw new Error()
      router.push(`/messages/${convId}`)
    } catch {
      toast.error("无法开始对话，请重试")
    } finally {
      setIsChatting(false)
    }
  }

  async function submitOffer() {
    if (!user || !item) return
    if (!offerTime.trim()) { toast.error("请填写期望交货时间"); return }
    setIsSubmittingOffer(true)
    try {
      const token = getToken()
      const convId = await getOrCreateConversation()
      if (!convId) throw new Error("创建会话失败")
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          conversation_id: convId,
          sender_id: user.id,
          content: "发送了一个购买请求",
          message_type: "offer",
          metadata: {
            delivery_method: offerDelivery,
            preferred_time: offerTime.trim(),
            item_title: item.title,
            item_price: item.price,
            status: "pending",
          },
        }),
      })
      if (!res.ok) throw new Error()
      setShowOfferModal(false)
      setOfferTime("")
      toast.success("购买请求已发送！")
      router.push(`/messages/${convId}`)
    } catch {
      toast.error("发送失败，请重试")
    } finally {
      setIsSubmittingOffer(false)
    }
  }

  useEffect(() => {
    didIncrement.current = false
    setCurrentImageIndex(0)
  }, [id])

  useEffect(() => {
    fetchItem(id).then(async (data) => {
      if (data) {
        setItem(data)
        const recs = await fetchRecommended(data.category, id)
        setRecommended(recs)
        if (!didIncrement.current) {
          didIncrement.current = true
          fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_view_count`, {
            method: "POST",
            headers: anonHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ item_id: id }),
          }).catch(() => {})
        }
      }
      setIsLoading(false)
    })
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <p className="text-muted-foreground">商品不存在或已下架</p>
        <Link href="/" className="mt-4 text-sm text-primary">返回首页</Link>
      </div>
    )
  }

  const discount = item.original_price
    ? Math.round((1 - item.price / item.original_price) * 100)
    : 0

  // 分享：优先唤起系统面板（手机可直接选微信/小红书），不支持则复制链接
  async function shareItem() {
    if (!item) return
    const url = window.location.href
    const title = `$${item.price} ${item.title}`
    const text = [
      `${item.title} · $${item.price}`,
      item.original_price ? `原价 $${item.original_price}` : "",
      item.condition,
      item.location,
    ].filter(Boolean).join(" · ")

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (err) {
        // 用户主动取消，不提示错误
        if (err instanceof Error && err.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      toast.success("链接已复制，去粘贴给同学吧")
    } catch {
      toast.error("复制失败，请手动复制地址栏链接")
    }
  }

  return (
    <div className="pb-32 md:pb-0">
      {/* 桌面端：左右两栏 */}
      <div className="md:grid md:grid-cols-2 md:gap-0 md:min-h-screen">
      {/* 左列：图片 */}
      <div className="md:sticky md:top-0 md:h-screen md:overflow-hidden">
      {/* 顶部导航 */}
      <div className="absolute left-4 top-3 z-30">
        <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-sm backdrop-blur-sm hover:bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <div className="absolute right-4 top-3 z-30 flex gap-2">
        <button type="button" onClick={() => setShowWechatModal(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-sm backdrop-blur-sm hover:bg-card">
          <QrCode className="h-4 w-4" />
        </button>
        <button type="button" onClick={shareItem}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-sm backdrop-blur-sm hover:bg-card">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* 商品图片轮播 */}
      <div
        className="relative aspect-square w-full overflow-hidden bg-muted"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || !item.images?.length) return
          const diff = touchStartX.current - e.changedTouches[0].clientX
          if (Math.abs(diff) > 50) {
            if (diff > 0 && currentImageIndex < item.images.length - 1) {
              setCurrentImageIndex((i) => i + 1)
            } else if (diff < 0 && currentImageIndex > 0) {
              setCurrentImageIndex((i) => i - 1)
            }
          }
          touchStartX.current = null
        }}
      >
        {item.images && item.images.length > 0 ? (
          <Image
            src={item.images[currentImageIndex]}
            alt={`${item.title} - 图片 ${currentImageIndex + 1}`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无图片</div>
        )}

        {/* 左箭头 */}
        {item.images && item.images.length > 1 && currentImageIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentImageIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* 右箭头 */}
        {item.images && item.images.length > 1 && currentImageIndex < item.images.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentImageIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* 图片计数 */}
        {item.images && item.images.length > 1 && (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white backdrop-blur-sm">
            {currentImageIndex + 1} / {item.images.length}
          </div>
        )}

        {/* 底部圆点指示器 */}
        {item.images && item.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {item.images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentImageIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* 已售出遮罩 */}
        {item.is_sold && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/90 px-6 py-2 text-sm font-bold text-gray-800 shadow">已售出</span>
          </div>
        )}
      </div>

      </div>
      {/* 右列：详情 */}
      <div className="md:overflow-y-auto md:h-screen">
      <div className="px-4 py-4 md:px-8 md:py-8">
        {/* 价格 */}
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-primary">${item.price}</span>
          {item.original_price && (
            <>
              <span className="text-sm text-muted-foreground line-through">${item.original_price}</span>
              <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                -{discount}%
              </span>
            </>
          )}
        </div>

        {/* 标题 */}
        <h1 className="mt-3 text-lg font-semibold leading-snug text-foreground">{item.title}</h1>

        {/* 标签 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ConditionBadge condition={item.condition as any} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /><span>{item.view_count} 次浏览</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{new Date(item.created_at).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>

        {/* 交易信息 */}
        <div className="mt-4 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-secondary px-3 py-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="text-[10px] text-muted-foreground">交易地点</div>
              <div className="text-xs font-medium">{item.location || "未填写"}</div>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-secondary px-3 py-2.5">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="text-[10px] text-muted-foreground">交易方式</div>
              <div className="text-xs font-medium">{item.delivery_method}</div>
            </div>
          </div>
        </div>

        {/* 描述 */}
        {item.description && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold">商品描述</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        )}

        {/* 卖家信息 */}
        {item.profiles && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold">卖家信息</h2>
            <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {item.profiles.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="text-sm font-medium">{item.profiles.name ?? "用户"}</div>
                {item.profiles.school && (
                  <div className="text-xs text-muted-foreground">{item.profiles.school}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      </div>
      </div>
      {/* 猜你喜欢 */}
      {recommended.length > 0 && (
        <div className="mt-2 bg-muted/50 px-4 pb-4 pt-5">
          <h2 className="mb-4 text-base font-semibold">猜你喜欢</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recommended.map((rec) => (
              <Link key={rec.id} href={`/items/${rec.id}`}
                className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-square bg-muted">
                  {rec.images?.[0] ? (
                    <Image src={rec.images[0]} alt={rec.title} fill className="object-cover" sizes="50vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium">{rec.title}</p>
                  <p className="mt-1 text-sm font-bold text-primary">${rec.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-2.5">
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => toast.success("已复制卖家联系方式")}
              className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 hover:bg-accent">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">留言</span>
            </button>
            <button type="button"
              onClick={() => {
                if (!user) { router.push("/auth"); return }
                toggleFavorite(id)
                toast(favorited ? "已取消收藏" : "已收藏")
              }}
              className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 hover:bg-accent">
              <Heart className={cn("h-5 w-5", favorited ? "fill-destructive text-destructive" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", favorited ? "text-destructive" : "text-muted-foreground")}>
                {favorited ? "已收藏" : "收藏"}
              </span>
            </button>
          </div>
          <div className="h-8 w-px shrink-0 bg-border" />
          <div className="flex flex-1 gap-2">
            {item.is_sold ? (
              <div className="flex flex-1 items-center justify-center rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
                该商品已售出
              </div>
            ) : (
              <>
                <Button onClick={startChat} disabled={isChatting} variant="outline"
                  className="flex-1 rounded-full border-primary text-primary hover:bg-primary/5" size="lg">
                  {isChatting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  聊一聊
                </Button>
                <Button
                  onClick={() => {
                    if (!user) { router.push("/auth"); return }
                    if (user.id === item.seller_id) { toast.error("这是你自己的商品"); return }
                    setShowOfferModal(true)
                  }}
                  className="flex-1 rounded-full" size="lg">
                  我要了
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* 购买请求弹窗 */}
      {showOfferModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOfferModal(false)} />
          <div className="relative w-full rounded-t-2xl bg-background px-5 pb-10 pt-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold">发送购买请求</h3>
              <button type="button" onClick={() => setShowOfferModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <p className="mb-5 text-xs text-muted-foreground">卖家确认后交易即达成</p>

            {/* 交货方式 */}
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">交货方式</p>
              <div className="grid grid-cols-3 gap-2">
                {(["自取", "邮寄", "均可"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setOfferDelivery(m)}
                    className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      offerDelivery === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 期望时间 */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium">期望交货时间 <span className="text-destructive">*</span></p>
              <input
                value={offerTime}
                onChange={(e) => setOfferTime(e.target.value)}
                placeholder="例如：周六下午 2pm，或本周任意时间"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <Button onClick={submitOffer} disabled={isSubmittingOffer} className="w-full rounded-full" size="lg">
              {isSubmittingOffer ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />发送中...</> : "确认发送请求"}
            </Button>
          </div>
        </div>
      )}

      {/* 微信分享二维码弹窗 */}
      {showWechatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWechatModal(false)} />
          <div className="relative mx-4 w-full max-w-xs rounded-2xl bg-background px-6 pb-6 pt-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">分享到微信</h3>
              <button type="button" onClick={() => setShowWechatModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="overflow-hidden rounded-xl border border-border p-2 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  alt="商品二维码"
                  width={180}
                  height={180}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                截图此二维码<br />在微信中发送给好友或分享到朋友圈
              </p>
              <p className="text-xs font-medium text-foreground line-clamp-1 px-2">{item.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
