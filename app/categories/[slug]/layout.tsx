import type { Metadata } from "next"
import type { ReactNode } from "react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

const CATEGORIES: Record<string, { name: string; blurb: string }> = {
  textbooks:   { name: "教材书籍", blurb: "课本、参考书、习题册，学长学姐的教材便宜转给你" },
  electronics: { name: "电子产品", blurb: "笔记本、显示器、iPad、耳机，毕业季电子产品低价出" },
  furniture:   { name: "家具生活", blurb: "床垫、书桌、沙发、厨具，搬家季家具好物等你捡漏" },
  clothing:    { name: "服装配饰", blurb: "冬衣、包包、鞋子、学位服，闲置服饰超值转让" },
  transport:   { name: "交通工具", blurb: "自行车、电动车、滑板车，通勤代步二手更划算" },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = CATEGORIES[slug]
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
