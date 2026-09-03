"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, PlusCircle, MapPin, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useUnreadCount } from "@/lib/use-unread-count"

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/messages", label: "消息", icon: MessageCircle },
  { href: "/publish", label: "发布", icon: PlusCircle, isPublish: true },
  { href: "/nearby", label: "附近", icon: MapPin },
  { href: "/profile", label: "我的", icon: User, isProfile: true },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user, profile, isLoading } = useAuth()
  const unreadCount = useUnreadCount()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon

          if (item.isPublish) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            )
          }

          if (item.isProfile) {
            const href = user ? "/profile" : "/auth"
            const label = user ? "我的" : "登录"
            return (
              <Link key={item.href} href={href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {!isLoading && user ? (
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                )}
                <span className="font-medium">{label}</span>
              </Link>
            )
          }

          const showBadge = item.href === "/messages" && unreadCount > 0
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                {showBadge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
