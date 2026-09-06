"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Package, ShoppingBag, Heart, Settings, ChevronRight, Info, LogOut, HelpCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getToken } from "@/lib/utils"
import { fetchRatingSummary, type RatingSummary } from "@/lib/reviews"
import { ReviewList } from "@/components/rating-display"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const menuItems = [
  { icon: Package, label: "我的发布", description: "管理已发布的商品", href: "/my-listings" },
  { icon: ShoppingBag, label: "我的购买", description: "查看购买记录", href: "/my-purchases" },
  { icon: Heart, label: "我的收藏", description: "浏览收藏的好物", href: "/favorites" },
  { icon: Settings, label: "账号设置", description: "修改个人信息", href: "/settings" },
  { icon: HelpCircle, label: "帮助中心", description: "常见问题解答", href: "#" },
  { icon: Info, label: "关于闲置帮", description: "版本 1.0.0", href: "#" },
]

export default function ProfilePage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const router = useRouter()
  const [listedCount, setListedCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)
  const [favCount, setFavCount] = useState(0)
  const [summary, setSummary] = useState<RatingSummary>({ rating: 0, reviewCount: 0 })

  useEffect(() => {
    if (!user) return
    fetchRatingSummary(user.id).then(setSummary)
  }, [user])

  useEffect(() => {
    if (!isLoading && !user) router.push("/auth")
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    const token = getToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/items?seller_id=eq.${user.id}&select=is_sold`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data: { is_sold: boolean }[]) => {
        if (!Array.isArray(data)) return
        setListedCount(data.length)
        setSoldCount(data.filter((d) => d.is_sold).length)
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    const token = getToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&select=item_id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data: { item_id: string }[]) => {
        if (Array.isArray(data)) setFavCount(data.length)
      })
      .catch(() => {})
  }, [user])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "用户"
  const displaySchool = profile?.school ?? "未设置学校"
  const avatarLetter = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold">
            {avatarLetter}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="mt-0.5 text-sm text-primary-foreground/80">{displaySchool}</p>
            {summary.reviewCount > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < Math.round(summary.rating) ? "fill-current" : "text-primary-foreground/30"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-sm font-medium">{summary.rating.toFixed(1)}</span>
                <span className="text-xs text-primary-foreground/60">
                  ({summary.reviewCount} 条评价)
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-primary-foreground/60">暂无评价</div>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary-foreground/10 p-3 text-center">
            <div className="text-xl font-bold">{listedCount}</div>
            <div className="mt-0.5 text-xs text-primary-foreground/70">已发布</div>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3 text-center">
            <div className="text-xl font-bold">{soldCount}</div>
            <div className="mt-0.5 text-xs text-primary-foreground/70">已售出</div>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3 text-center">
            <div className="text-xl font-bold">{favCount}</div>
            <div className="mt-0.5 text-xs text-primary-foreground/70">收藏</div>
          </div>
        </div>
      </div>
      {/* 我收到的评价 */}
      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">我收到的评价</h2>
          {summary.reviewCount > 0 && (
            <a href={`/users/${user.id}`} className="text-xs text-primary">
              查看主页
            </a>
          )}
        </div>
        <ReviewList userId={user.id} limit={5} />
      </section>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <a key={item.label} href={item.href} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent ${index > 0 ? "border-t border-border" : ""}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-card-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </a>
          )
        })}
      </div>
      <button type="button" onClick={handleSignOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5">
        <LogOut className="h-4 w-4" />
        退出登录
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground">{user.email}</p>
    </div>
  )
}
