"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, PlusCircle, MapPin, User, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useUnreadCount } from "@/lib/use-unread-count"

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/nearby", label: "附近", icon: MapPin },
  { href: "/messages", label: "消息", icon: MessageCircle },
  { href: "/profile", label: "我的", icon: User, isProfile: true },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { user, profile, isLoading } = useAuth()
  const unreadCount = useUnreadCount()

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="sticky top-0 flex flex-col h-screen py-6 px-3">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-foreground leading-tight">闲置帮</div>
            <div className="text-[10px] text-muted-foreground leading-tight">留学生二手平台</div>
          </div>
        </Link>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon

            if (item.isProfile) {
              const href = user ? "/profile" : "/auth"
              const label = user ? (profile?.name ?? "我的") : "登录"
              return (
                <Link key={item.href} href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}>
                  {!isLoading && user ? (
                    <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <Icon className="h-5 w-5 shrink-0" />
                  )}
                  {label}
                </Link>
              )
            }

            const showBadge = item.href === "/messages" && unreadCount > 0
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}>
                <div className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Publish button at bottom */}
        <Link href="/publish"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
          <PlusCircle className="h-4 w-4" />
          发布商品
        </Link>
      </div>
    </aside>
  )
}
