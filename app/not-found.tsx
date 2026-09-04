import Link from "next/link"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-7xl font-bold text-primary/20">404</div>
      <div>
        <h1 className="text-xl font-bold text-foreground">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">你要找的页面已移动、删除或从未存在过</p>
      </div>
      <div className="flex gap-3">
        <Link href="/"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <Home className="h-4 w-4" />
          回到首页
        </Link>
        <Link href="/?q="
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
          <Search className="h-4 w-4" />
          搜索商品
        </Link>
      </div>
    </div>
  )
}
