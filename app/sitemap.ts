import type { MetadataRoute } from "next"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

const CATEGORY_SLUGS = ["textbooks", "electronics", "furniture", "clothing", "transport"]

// 每小时重新生成，新商品能较快被收录
export const revalidate = 3600

async function fetchRows<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const rows = await res.json()
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/nearby`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ]

  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/categories/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  // 在售商品（上限 5000，Next.js 单个 sitemap 建议 <50000）
  const items = await fetchRows<{ id: string; updated_at: string | null; created_at: string }>(
    "items?is_sold=eq.false&select=id,updated_at,created_at&order=created_at.desc&limit=5000"
  )
  const itemPages: MetadataRoute.Sitemap = items.map((it) => ({
    url: `${SITE_URL}/items/${it.id}`,
    lastModified: new Date(it.updated_at ?? it.created_at),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }))

  // 有在售商品的卖家主页
  const sellers = await fetchRows<{ id: string; updated_at: string | null }>(
    "profiles?items_count=gt.0&select=id,updated_at&limit=2000"
  )
  const sellerPages: MetadataRoute.Sitemap = sellers.map((s) => ({
    url: `${SITE_URL}/users/${s.id}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }))

  return [...staticPages, ...categoryPages, ...itemPages, ...sellerPages]
}
