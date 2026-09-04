"use client"

import { useEffect } from "react"
import { RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-7xl font-bold text-destructive/20">!</div>
      <div>
        <h1 className="text-xl font-bold text-foreground">出了点问题</h1>
        <p className="mt-2 text-sm text-muted-foreground">页面加载失败，请重试或返回首页</p>
      </div>
      <div className="flex gap-3">
        <button onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
        <Link href="/"
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
          <Home className="h-4 w-4" />
          回到首页
        </Link>
      </div>
    </div>
  )
}
