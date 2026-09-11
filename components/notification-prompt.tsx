"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"
import { toast } from "sonner"
import { useNotifications } from "@/lib/notifications"

const DISMISS_KEY = "xzb_notify_prompt_dismissed"

/**
 * 消息页顶部的开启提示。
 * 浏览器要求权限请求必须由用户手势触发，所以不能在页面加载时自动弹。
 * 用户点过「不用了」就不再显示。
 */
export function NotificationPrompt() {
  const { permission, requestPermission } = useNotifications()
  const [dismissed, setDismissed] = useState(true) // 默认隐藏，避免 SSR 闪烁

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  // 已授权、已拒绝、或浏览器不支持时都不显示
  if (permission !== "default" || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* noop */
    }
  }

  async function enable() {
    const p = await requestPermission()
    if (p === "granted") toast.success("已开启，有新消息会第一时间提醒你")
    else if (p === "denied") toast.error("已被浏览器拒绝，可在地址栏权限设置里改回来")
    dismiss()
  }

  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">开启新消息提醒</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          买家联系你时会弹出提醒，不用一直守着页面刷新
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={enable}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            开启提醒
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            不用了
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="关闭"
        className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
