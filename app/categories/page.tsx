"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CATEGORIES } from "@/lib/categories"
import { CategoryIcon } from "@/components/category-icon"
import { Loader2 } from "lucide-react"
import { SUPABASE_URL, anonHeaders } from "@/lib/supabase-rest"

export default function CategoriesPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(
      `${SUPABASE_URL}/rest/v1/items?is_sold=eq.false&select=category`,
      { headers: anonHeaders() }
    )
      .then((r) => r.json())
      .then((data: { category: string }[]) => {
        if (!Array.isArray(data)) return
        const result: Record<string, number> = {}
        for (const item of data) {
          result[item.category] = (result[item.category] ?? 0) + 1
        }
        setCounts(result)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">全部分类</h1>
      <div className="grid grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="flex flex-col items-center"
          >
            <CategoryIcon icon={cat.icon} name={cat.name} size="lg" />
            <span className="mt-1 text-xs text-muted-foreground">
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${counts[cat.slug] ?? 0} 件`
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
