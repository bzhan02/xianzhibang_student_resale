"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X, Clock, TrendingUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchSuggestions,
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  HOT_SEARCHES,
} from "@/lib/search"

export function SearchBar({
  placeholder = "搜索二手好物...",
  initialValue = "",
  className,
}: {
  placeholder?: string
  initialValue?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initialValue)
  const [focused, setFocused] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reqId = useRef(0)

  useEffect(() => {
    setHistory(getSearchHistory())
  }, [])

  // 与地址栏同步：在 /search 页显示当前关键词，离开后清空
  useEffect(() => {
    if (typeof window === "undefined") return
    if (pathname === "/search") {
      const urlQ = new URLSearchParams(window.location.search).get("q") ?? ""
      setValue(urlQ)
    } else {
      setValue("")
    }
    setFocused(false)
  }, [pathname])

  // 点击外部关闭下拉
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // 输入联想（防抖 250ms）
  useEffect(() => {
    const term = value.trim()
    if (!term) {
      setSuggestions([])
      setIsSuggesting(false)
      return
    }
    setIsSuggesting(true)
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      const res = await fetchSuggestions(term)
      if (id !== reqId.current) return
      setSuggestions(res)
      setIsSuggesting(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [value])

  const go = useCallback(
    (term: string) => {
      const t = term.trim()
      setFocused(false)
      if (t) {
        setValue(t)
        setHistory(addSearchHistory(t))
        router.push(`/search?q=${encodeURIComponent(t)}`)
      } else {
        router.push("/search")
      }
    },
    [router]
  )

  const showDropdown = focused
  const showSuggestions = value.trim().length > 0

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          go(value)
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          inputMode="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          className="h-9 w-full rounded-full border border-input bg-secondary pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {value && (
          <button
            type="button"
            aria-label="清空"
            onClick={() => {
              setValue("")
              setSuggestions([])
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-lg">
          {showSuggestions ? (
            /* ── 输入联想 ── */
            isSuggesting ? (
              <div className="flex items-center gap-2 px-1 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                搜索中...
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="flex flex-col">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(s)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-accent"
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{highlight(s, value.trim())}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(value)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                搜索 &ldquo;<span className="font-medium text-primary">{value.trim()}</span>&rdquo;
              </button>
            )
          ) : (
            /* ── 历史 + 热门 ── */
            <>
              {history.length > 0 && (
                <section className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      搜索历史
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        clearSearchHistory()
                        setHistory([])
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((h) => (
                      <span
                        key={h}
                        className="group flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1.5 text-xs text-foreground"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => go(h)}
                          className="max-w-[10rem] truncate"
                        >
                          {h}
                        </button>
                        <button
                          type="button"
                          aria-label={`删除 ${h}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setHistory(removeSearchHistory(h))}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  热门搜索
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HOT_SEARCHES.map((h, i) => (
                    <button
                      key={h}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(h)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition-colors hover:bg-accent",
                        i < 3 ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** 把匹配到的部分加粗 */
function highlight(text: string, term: string) {
  if (!term) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-primary">{text.slice(idx, idx + term.length)}</span>
      {text.slice(idx + term.length)}
    </>
  )
}
