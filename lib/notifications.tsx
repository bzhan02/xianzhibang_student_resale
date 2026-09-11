"use client"

/**
 * 全局消息通知。
 *
 * 此前的问题：Realtime 订阅只建立在聊天详情页，人在首页时即使开着网站也
 * 收不到新消息提醒，未读红点靠 30 秒轮询。这里把订阅提到全局，并在页面
 * 不可见时用浏览器通知 + 标题闪烁 + favicon 徽点提醒。
 *
 * 覆盖范围：能提醒"开着网站但在别的标签页/别的页面"。
 * 关掉浏览器就收不到 —— 那需要 Web Push 或邮件，见 README 待完善功能。
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"
import { restOr } from "./supabase-rest"

const PREF_KEY = "xzb_notify_enabled"
const BASE_TITLE = "闲置帮 - 留学生二手交易平台"

type Permission = "default" | "granted" | "denied" | "unsupported"

interface NotificationState {
  unreadCount: number
  permission: Permission
  /** 用户是否开启了桌面通知（与浏览器权限分开，方便随时关掉） */
  enabled: boolean
  /** 必须由用户点击触发，浏览器不允许页面加载就弹权限框 */
  requestPermission: () => Promise<Permission>
  setEnabled: (v: boolean) => void
  refreshUnread: () => void
}

const Ctx = createContext<NotificationState | null>(null)

/* ---------------- favicon 徽点 ---------------- */

let originalFavicon: string | null = null

function faviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-dynamic]")
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    link.setAttribute("data-dynamic", "")
    document.head.appendChild(link)
  }
  return link
}

function drawBadge(count: number) {
  try {
    const size = 64
    const c = document.createElement("canvas")
    c.width = c.height = size
    const ctx = c.getContext("2d")
    if (!ctx) return

    // 主色圆底 + 「闲」字，与站内 logo 一致
    ctx.fillStyle = "#2a9d5c"
    ctx.beginPath()
    // roundRect 在较老的 Safari 上不存在，降级成直角矩形
    if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, size, size, 14)
    else ctx.rect(0, 0, size, size)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 38px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("闲", size / 2, size / 2 + 2)

    if (count > 0) {
      const r = 20
      ctx.fillStyle = "#e5484d"
      ctx.beginPath()
      ctx.arc(size - r + 4, r - 4, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 26px system-ui, sans-serif"
      ctx.fillText(count > 9 ? "9+" : String(count), size - r + 4, r - 2)
    }
    faviconLink().href = c.toDataURL("image/png")
  } catch {
    /* canvas 不可用时忽略，不影响主流程 */
  }
}

function restoreFavicon() {
  try {
    if (originalFavicon) faviconLink().href = originalFavicon
  } catch {
    /* noop */
  }
}

/* ---------------- Provider ---------------- */

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [unreadCount, setUnreadCount] = useState(0)
  const [permission, setPermission] = useState<Permission>("default")
  const [enabled, setEnabledState] = useState(true)

  // Realtime 回调里读到的会是初次渲染的闭包值，用 ref 保证拿到最新的
  const userRef = useRef(user)
  const pathRef = useRef(pathname)
  const enabledRef = useRef(enabled)
  const permRef = useRef(permission)
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { pathRef.current = pathname }, [pathname])
  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { permRef.current = permission }, [permission])

  /* ---- 初始化：权限状态与用户偏好 ---- */
  useEffect(() => {
    if (typeof window === "undefined") return
    originalFavicon =
      document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href ?? "/icon.svg"
    setPermission("Notification" in window ? Notification.permission : "unsupported")
    try {
      setEnabledState(localStorage.getItem(PREF_KEY) !== "0")
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [])

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v)
    try {
      localStorage.setItem(PREF_KEY, v ? "1" : "0")
    } catch {
      /* noop */
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<Permission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
    const p = await Notification.requestPermission()
    setPermission(p as Permission)
    if (p === "granted") setEnabled(true)
    return p as Permission
  }, [setEnabled])

  /* ---- 未读计数 ---- */
  const refreshUnread = useCallback(async () => {
    const u = userRef.current
    if (!u) {
      setUnreadCount(0)
      return
    }
    const convs = await restOr<{ id: string }[]>(
      `conversations?or=(buyer_id.eq.${u.id},seller_id.eq.${u.id})&select=id`,
      [], { auth: true }
    )
    if (convs.length === 0) {
      setUnreadCount(0)
      return
    }
    const ids = convs.map((c) => c.id).join(",")
    const rows = await restOr<{ id: string }[]>(
      `messages?conversation_id=in.(${ids})&is_read=eq.false&sender_id=neq.${u.id}&select=id`,
      [], { auth: true }
    )
    setUnreadCount(rows.length)
  }, [])

  /* ---- 标题闪烁 + favicon 徽点 ---- */
  useEffect(() => {
    if (typeof document === "undefined") return

    function stopFlash() {
      if (flashTimer.current) {
        clearInterval(flashTimer.current)
        flashTimer.current = null
      }
      document.title = BASE_TITLE
    }

    // 页面可见、或没有未读时，恢复原样
    if (unreadCount === 0 || document.visibilityState === "visible") {
      stopFlash()
      if (unreadCount === 0) restoreFavicon()
      else drawBadge(unreadCount)
      return
    }

    drawBadge(unreadCount)
    let on = true
    document.title = `(${unreadCount}) 新消息 · 闲置帮`
    flashTimer.current = setInterval(() => {
      on = !on
      document.title = on ? `(${unreadCount}) 新消息 · 闲置帮` : BASE_TITLE
    }, 1500)

    return stopFlash
  }, [unreadCount])

  // 切回页面时立刻停闪并刷新
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        document.title = BASE_TITLE
        refreshUnread()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [refreshUnread])

  /* ---- 弹出浏览器通知 ---- */
  const notify = useCallback(
    async (msg: { conversation_id: string; content: string; message_type: string }) => {
      if (!enabledRef.current || permRef.current !== "granted") return
      if (typeof window === "undefined" || !("Notification" in window)) return

      // 补齐发送者与商品信息，让通知有上下文
      const convs = await restOr<
        { items: { title: string | null } | null; buyer: { name: string | null } | null; seller: { name: string | null } | null; buyer_id: string }[]
      >(
        `conversations?id=eq.${msg.conversation_id}` +
          `&select=buyer_id,items(title),buyer:profiles!buyer_id(name),seller:profiles!seller_id(name)`,
        [], { auth: true }
      )
      const c = convs[0]
      const me = userRef.current?.id
      const senderName = c
        ? (c.buyer_id === me ? c.seller?.name : c.buyer?.name) ?? "对方"
        : "对方"
      const itemTitle = c?.items?.title ?? ""

      const body =
        msg.message_type === "offer"
          ? "想购买你的商品，点击查看详情"
          : msg.content.slice(0, 60)

      try {
        // renotify 不在 TS 的 NotificationOptions 类型里，但规范支持（需配合 tag）
        const opts: NotificationOptions & { renotify?: boolean } = {
          body: itemTitle ? `${itemTitle}\n${body}` : body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          // 同一会话的多条消息折叠成一条，避免刷屏
          tag: `conv-${msg.conversation_id}`,
          renotify: true,
        }
        const n = new Notification(`${senderName} 发来消息`, opts)
        n.onclick = () => {
          window.focus()
          router.push(`/messages/${msg.conversation_id}`)
          n.close()
        }
      } catch {
        /* 某些浏览器在非 PWA 环境下会抛错，忽略 */
      }
    },
    [router]
  )

  /* ---- 全局 Realtime 订阅 ---- */
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    refreshUnread()

    // 不加 filter：messages 表的 RLS（messages_participant）会保证
    // 只推送当前用户参与的会话，见 002_conversations_messages.sql
    const channel = supabase
      .channel("global-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as {
            conversation_id: string
            sender_id: string
            content: string
            message_type: string
          }
          const u = userRef.current
          if (!u || m.sender_id === u.id) return // 自己发的不提醒

          refreshUnread()

          // 正在看这个会话就别弹了，聊天页会直接渲染出来
          if (pathRef.current === `/messages/${m.conversation_id}`) return
          notify(m)
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => refreshUnread() // 已读状态变化
      )
      .subscribe()

    // Realtime 未启用或断线时的兜底，频率比原来的 30 秒低
    const poll = setInterval(refreshUnread, 60_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [user, refreshUnread, notify])

  const value = useMemo(
    () => ({ unreadCount, permission, enabled, requestPermission, setEnabled, refreshUnread }),
    [unreadCount, permission, enabled, requestPermission, setEnabled, refreshUnread]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications(): NotificationState {
  const ctx = useContext(Ctx)
  if (!ctx) {
    // Provider 未挂载时返回安全默认值，避免组件崩溃
    return {
      unreadCount: 0,
      permission: "default",
      enabled: false,
      requestPermission: async () => "default",
      setEnabled: () => {},
      refreshUnread: () => {},
    }
  }
  return ctx
}
