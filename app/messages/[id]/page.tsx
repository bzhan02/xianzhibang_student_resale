"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle, Clock, Truck, Calendar } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ReviewDialog, ReviewPrompt } from "@/components/review-dialog"
import { fetchMyReviewForConversation, type Review } from "@/lib/reviews"
import { SUPABASE_URL, authHeaders } from "@/lib/supabase-rest"

type OfferMeta = {
  delivery_method: string
  preferred_time: string
  item_title: string
  item_price: number
  status: "pending" | "accepted" | "rejected"
  rejection_reason?: string
}

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
  message_type: string
  metadata: OfferMeta | null
}

type ConvDetail = {
  id: string
  buyer_id: string
  seller_id: string
  item_id: string
  items: { title: string; price: number; images: string[] } | null
  buyer: { name: string | null } | null
  seller: { name: string | null } | null
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [conv, setConv] = useState<ConvDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [user, authLoading, router])

  // 加载会话信息
  useEffect(() => {
    if (!user) return
    fetch(
      `${SUPABASE_URL}/rest/v1/conversations?id=eq.${id}&select=id,buyer_id,seller_id,item_id,items(title,price,images),buyer:profiles!buyer_id(name),seller:profiles!seller_id(name)&limit=1`,
      { headers: authHeaders() }
    )
      .then((r) => r.json())
      .then((data) => { if (data[0]) setConv(data[0]); setIsLoading(false) })
  }, [id, user])

  // 我在这笔交易里是否已评价
  useEffect(() => {
    if (!user) return
    fetchMyReviewForConversation(id, user.id).then(setMyReview)
  }, [id, user])

  // 标记消息已读
  async function markRead(msgs: Message[]) {
    const u = userRef.current
    if (!u) return
    const unreadIds = msgs.filter((m) => !m.is_read && m.sender_id !== u.id).map((m) => m.id)
    if (unreadIds.length > 0) {
      fetch(`${SUPABASE_URL}/rest/v1/messages?id=in.(${unreadIds.join(",")})`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ is_read: true }),
      }).catch(() => {})
    }
  }

  // 加载所有消息
  async function loadMessages() {
    const u = userRef.current
    if (!u) return
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${id}&select=*&order=created_at.asc`,
      { headers: authHeaders() }
    )
    if (!res.ok) return
    const data: Message[] = await res.json()
    setMessages(data)
    markRead(data)
  }

  // Supabase Realtime 订阅（降级到轮询作为保障）
  useEffect(() => {
    if (!user || isLoading) return

    loadMessages()

    // Realtime 订阅新消息
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => { loadMessages() }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => { loadMessages() }
      )
      .subscribe()

    // 保底轮询（10 秒，确保 Realtime 未开启时也能工作）
    const poll = setInterval(loadMessages, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [id, user, isLoading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !user || isSending) return
    const content = input.trim()
    setInput("")
    setIsSending(true)
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ conversation_id: id, sender_id: user.id, content, message_type: "text" }),
    })
    setIsSending(false)
    loadMessages()
  }

  async function acceptOffer(msgId: string, meta: OfferMeta) {
    await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${msgId}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ metadata: { ...meta, status: "accepted" } }),
    })
    if (conv?.item_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${conv.item_id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ is_sold: true }),
      })
    }
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ conversation_id: id, sender_id: user!.id, content: "✅ 已确认交易！期待与你顺利完成交易。", message_type: "text" }),
    })
    toast.success("已接受购买请求，商品标记为已售出")
    loadMessages()
  }

  async function rejectOffer(msgId: string, meta: OfferMeta) {
    if (!rejectReason.trim()) { toast.error("请填写拒绝原因"); return }
    await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${msgId}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ metadata: { ...meta, status: "rejected", rejection_reason: rejectReason.trim() } }),
    })
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ conversation_id: id, sender_id: user!.id, content: `❌ 拒绝了购买请求：${rejectReason.trim()}`, message_type: "text" }),
    })
    setRejectingId(null)
    setRejectReason("")
    toast("已拒绝购买请求")
    loadMessages()
  }

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!conv || !user) return null

  const isSeller = conv.seller_id === user.id
  const otherName = isSeller ? (conv.buyer?.name ?? "买家") : (conv.seller?.name ?? "卖家")

  // 交易确认（有已接受的 offer）后才允许评价
  const dealConfirmed = messages.some(
    (m) => m.message_type === "offer" && m.metadata?.status === "accepted"
  )
  const counterpartId = isSeller ? conv.buyer_id : conv.seller_id
  const myRole: "buyer" | "seller" = isSeller ? "seller" : "buyer"

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button type="button" onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">{otherName}</p>
          {conv.items && <p className="truncate text-xs text-muted-foreground">{conv.items.title}</p>}
        </div>
        {conv.items?.images?.[0] && (
          <Link href={`/items/${conv.item_id}`} className="shrink-0">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border">
              <Image src={conv.items.images[0]} alt="" fill className="object-cover" sizes="40px" />
            </div>
          </Link>
        )}
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {conv.items && (
          <Link href={`/items/${conv.item_id}`}
            className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {conv.items.images?.[0] && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={conv.items.images[0]} alt="" fill className="object-cover" sizes="56px" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{conv.items.title}</p>
              <p className="text-sm font-bold text-primary">${conv.items.price}</p>
            </div>
          </Link>
        )}

        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">发送消息开始对话吧</p>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user.id
          const time = new Date(msg.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

          if (msg.message_type === "offer" && msg.metadata) {
            const meta = msg.metadata
            const statusColor = meta.status === "accepted" ? "border-green-500/30 bg-green-50 dark:bg-green-950/20"
              : meta.status === "rejected" ? "border-destructive/30 bg-destructive/5"
              : "border-primary/30 bg-primary/5"

            return (
              <div key={msg.id} className="mb-4">
                <div className={cn("rounded-2xl border p-4", statusColor)}>
                  <div className="mb-3 flex items-center gap-2">
                    {meta.status === "pending" && <Clock className="h-4 w-4 text-primary" />}
                    {meta.status === "accepted" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {meta.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-sm font-semibold">
                      {meta.status === "pending" && "购买请求"}
                      {meta.status === "accepted" && "交易已确认 🎉"}
                      {meta.status === "rejected" && "请求被拒绝"}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{time}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 shrink-0" />
                      <span>交货方式：<span className="font-medium text-foreground">{meta.delivery_method}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>期望时间：<span className="font-medium text-foreground">{meta.preferred_time}</span></span>
                    </div>
                    {meta.status === "rejected" && meta.rejection_reason && (
                      <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        拒绝原因：{meta.rejection_reason}
                      </div>
                    )}
                  </div>
                  {isSeller && meta.status === "pending" && (
                    <div className="mt-3 space-y-2">
                      {rejectingId === msg.id ? (
                        <div className="space-y-2">
                          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="请填写拒绝原因（必填）"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setRejectingId(null); setRejectReason("") }}
                              className="flex-1 rounded-lg border border-border py-2 text-xs text-muted-foreground hover:bg-accent">取消</button>
                            <button type="button" onClick={() => rejectOffer(msg.id, meta)}
                              className="flex-1 rounded-lg bg-destructive py-2 text-xs font-medium text-white hover:bg-destructive/90">确认拒绝</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setRejectingId(msg.id); setRejectReason("") }}
                            className="flex-1 rounded-lg border border-destructive/40 py-2 text-xs font-medium text-destructive hover:bg-destructive/5">拒绝</button>
                          <button type="button" onClick={() => acceptOffer(msg.id, meta)}
                            className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">接受</button>
                        </div>
                      )}
                    </div>
                  )}
                  {!isSeller && meta.status === "pending" && (
                    <p className="mt-3 text-center text-xs text-muted-foreground">等待卖家确认中...</p>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={cn("mb-3 flex", isMine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[72%] flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isMine ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-secondary text-foreground"
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground">{time}</span>
              </div>
            </div>
          )
        })}
        {/* 交易确认后的评价入口 */}
        {dealConfirmed && (
          <ReviewPrompt
            reviewed={!!myReview}
            myRating={myReview?.rating ?? 0}
            onOpen={() => setReviewOpen(true)}
            counterpartName={otherName}
            role={myRole}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入栏 */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="输入消息..."
            className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button type="button" onClick={sendMessage} disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* 评价弹窗 */}
      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => {
          toast.success("评价已提交，感谢反馈！")
          fetchMyReviewForConversation(id, user.id).then(setMyReview)
        }}
        conversationId={id}
        itemId={conv.item_id}
        revieweeId={counterpartId}
        revieweeName={otherName}
        itemTitle={conv.items?.title ?? ""}
        reviewerRole={myRole}
        myUserId={user.id}
      />
    </div>
  )
}
