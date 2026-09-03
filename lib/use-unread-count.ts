"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./auth-context"
import { getToken } from "./utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  async function fetchCount() {
    if (!user) { setCount(0); return }
    const token = getToken()

    // 1. 获取用户的所有会话 ID
    const convRes = await fetch(
      `${SUPABASE_URL}/rest/v1/conversations?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&select=id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
    )
    if (!convRes.ok) return
    const convs: { id: string }[] = await convRes.json()
    if (!convs.length) { setCount(0); return }

    // 2. 统计这些会话中对方发的未读消息数
    const ids = convs.map((c) => c.id).join(",")
    const msgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${ids})&is_read=eq.false&sender_id=neq.${user.id}&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
      }
    )
    // Content-Range: 0-0/5 → 取 /5 的部分
    const range = msgRes.headers.get("Content-Range")
    const total = range ? parseInt(range.split("/")[1] ?? "0") : 0
    setCount(isNaN(total) ? 0 : total)
  }

  useEffect(() => {
    fetchCount()
    // 每 30 秒刷新一次
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [user])

  // 路由切换时也刷新（监听 focus 事件）
  useEffect(() => {
    window.addEventListener("focus", fetchCount)
    return () => window.removeEventListener("focus", fetchCount)
  }, [user])

  return count
}
