"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { BottomNav } from "./bottom-nav"
import { SidebarNav } from "./sidebar-nav"
import type { ReactNode } from "react"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isItemDetail = pathname.startsWith("/items/") && !pathname.endsWith("/edit")
  const isFullPage = pathname.startsWith("/auth") || pathname.startsWith("/publish")

  return (
    <>
      {/* ── 移动端布局 ── */}
      <div className="md:hidden mx-auto min-h-dvh max-w-lg bg-background">
        {!isItemDetail && <Header />}
        <main className={isItemDetail ? "" : "pb-20"}>{children}</main>
        {!isItemDetail && <BottomNav />}
      </div>

      {/* ── 桌面端布局 ── */}
      <div className="hidden md:flex min-h-screen bg-background">
        {!isFullPage && <SidebarNav />}
        <div className="flex flex-1 flex-col min-w-0">
          {!isItemDetail && !isFullPage && <DesktopHeader />}
          <main className="flex-1">
            <div className={isFullPage ? "" : "mx-auto max-w-5xl px-6 py-6"}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

function DesktopHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
        <DesktopSearch />
      </div>
    </header>
  )
}

function DesktopSearch() {
  return (
    <form action="/" method="get" className="relative flex-1 max-w-xl">
      <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        name="q"
        type="search"
        placeholder="搜索商品、学校、分类…"
        className="h-9 w-full rounded-full border border-input bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  )
}
