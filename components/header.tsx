"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { SearchBar } from "./search-bar"
import { useNotifications } from "@/lib/notifications"

export function Header() {
  const { unreadCount } = useNotifications()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">闲</span>
          </div>
          <span className="text-base font-bold text-foreground">闲置帮</span>
        </Link>
        <div className="flex-1">
          <SearchBar />
        </div>
        {/* 此前这里是个没有 onClick 的假按钮，且红点常亮。现在跳转消息并显示真实未读数 */}
        <Link
          href="/messages"
          aria-label={unreadCount > 0 ? `通知，${unreadCount} 条未读` : "通知"}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
