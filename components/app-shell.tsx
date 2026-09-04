"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { BottomNav } from "./bottom-nav"
import { SidebarNav } from "./sidebar-nav"
import { SearchBar } from "./search-bar"
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
        <SearchBar placeholder="搜索商品、学校、分类…" className="flex-1 max-w-xl" />
      </div>
    </header>
  )
}
