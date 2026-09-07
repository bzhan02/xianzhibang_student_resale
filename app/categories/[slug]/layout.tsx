import type { Metadata } from "next"
import type { ReactNode } from "react"
import { getCategory } from "@/lib/categories"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = getCategory(slug)
  if (!cat) return { title: "分类不存在 - 闲置帮" }

  const title = `${cat.name} - 留学生二手 | 闲置帮`
  const description = cat.blurb
  const url = `${SITE_URL}/categories/${slug}`

  return {
    title,
    description,
    keywords: [cat.name, "留学生二手", "闲置转让", `二手${cat.name}`],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "闲置帮",
      locale: "zh_CN",
      url,
      title,
      description,
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: cat.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/og-default.png`] },
  }
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
