import type { Metadata } from "next"
import type { ReactNode } from "react"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=name,school,rating,review_count,items_count,avatar_url&limit=1`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        next: { revalidate: 300 },
      }
    )
    const rows = res.ok ? await res.json() : []
    const p = Array.isArray(rows) ? rows[0] : null
    if (!p) return { title: "用户不存在 - 闲置帮" }

    const name = p.name ?? "用户"
    const title = `${name} 的闲置 - 闲置帮`
    const bits = [
      p.school,
      `在售 ${p.items_count ?? 0} 件`,
      (p.review_count ?? 0) > 0 ? `${Number(p.rating).toFixed(1)} 分 · ${p.review_count} 条评价` : "暂无评价",
    ].filter(Boolean)

    const url = `${SITE_URL}/users/${id}`
    const image = p.avatar_url || `${SITE_URL}/og-default.png`

    return {
      title,
      description: bits.join(" · "),
      alternates: { canonical: url },
      openGraph: {
        type: "profile",
        siteName: "闲置帮",
        locale: "zh_CN",
        url,
        title,
        description: bits.join(" · "),
        images: [{ url: image, alt: name }],
      },
      twitter: { card: "summary", title, description: bits.join(" · "), images: [image] },
    }
  } catch {
    return { title: "闲置帮" }
  }
}

export default function UserLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
