"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, MessageCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { SUPABASE_URL, authHeaders } from "@/lib/supabase-rest"

type Conversation = {
  id: string
  item_id: string
  buyer_id: string
  seller_id: string
  updated_at: string
  items: { title: string; images: string[] } | null
  buyer: { name: string | null } | null
  seller: { name: string | null } | null
  last_message?: string
  unread_count?: number
}

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    isFirstLoad.current = true
    loadConversations()
    const interval = setInterval(loadConversations, 10_000)
    return () => clearInterval(interval)
  }, [user])

  async function loadConversations() {
    if (isFirstLoad.current) setIsLoading(true)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/conversations?or=(buyer_id.eq.${user!.id},seller_id.eq.${user!.id})&select=id,item_id,buyer_id,seller_id,updated_at,items(title,images),buyer:profiles!buyer_id(name),seller:profiles!seller_id(name)&order=updated_at.desc`,
      { headers: authHeaders() }
    )
    if (!res.ok) { setIsLoading(false); isFirstLoad.current = false; return }
    const data: Conversation[] = await res.json()

    // 每个会话拉最近 20 条消息：取最后一条做预览，统计未读数
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const msgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conv.id}&select=content,is_read,sender_id,message_type&order=created_at.desc&limit=20`,
          { headers: authHeaders() }
        )
        if (msgRes.ok) {
          const msgs = await msgRes.json()
          const last = msgs[0]
          // 最新消息是 offer 类型时，显示友好文字而非原始 content
          const lastPreview = last?.message_type === "offer" ? "发送了一个购买请求" : (last?.content ?? "还没有消息")
          const unreadCount = msgs.filter((m: any) => !m.is_read && m.sender_id !== user!.id).length
          return {
            ...conv,
            last_message: lastPreview,
            unread_count: unreadCount,
          }
        }
        return { ...conv, last_message: "还没有消息", unread_count: 0 }
      })
    )
    setConversations(enriched)
    setIsLoading(false)
    isFirstLoad.current = false
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
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-base font-semibold">消息</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">还没有消息</p>
          <p className="text-xs text-muted-foreground">在商品详情页点"聊一聊"开始对话</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((conv) => {
            const isBuyer = conv.buyer_id === user.id
            const otherName = isBuyer ? (conv.seller?.name ?? "卖家") : (conv.buyer?.name ?? "买家")
            const itemImage = conv.items?.images?.[0]
            const timeStr = new Date(conv.updated_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors">
                {/* 商品图 */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {itemImage ? (
                    <Image src={itemImage} alt={conv.items?.title ?? ""} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">无图</div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{otherName}</span>
                    <span className="text-xs text-muted-foreground">{timeStr}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conv.items?.title && <span className="text-primary">[{conv.items.title}] </span>}
                    {conv.last_message}
                  </p>
                </div>

                {/* 未读红点 */}
                {(conv.unread_count ?? 0) > 0 && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {conv.unread_count}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
