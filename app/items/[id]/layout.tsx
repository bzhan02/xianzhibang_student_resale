import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SUPABASE_URL, anonHeaders } from "@/lib/supabase-rest"
import { categoryName } from "@/lib/categories"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

type ItemMeta = {
  id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  images: string[] | null
  category: string
  condition: string
  location: string | null
  is_sold: boolean
  profiles?: { name: string | null; school: string | null } | null
}

async function fetchItem(id: string): Promise<ItemMeta | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/items?id=eq.${id}&select=id,title,description,price,original_price,images,category,condition,location,is_sold,profiles!seller_id(name,school)&limit=1`,
      {
        headers: anonHeaders(),
        // 商品信息变动不频繁，缓存 60 秒，兼顾新鲜度与抓取速度
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return null
    const rows: ItemMeta[] = await res.json()
    return Array.isArray(rows) ? (rows[0] ?? null) : null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const item = await fetchItem(id)

  if (!item) {
    return {
      title: "商品不存在 - 闲置帮",
      description: "这件商品可能已被删除或链接有误。",
    }
  }

  const catName = categoryName(item.category)
  const school = item.profiles?.school ?? ""
  const seller = item.profiles?.name ?? ""

  // 标题：价格前置，最抓眼球
  const title = item.is_sold
    ? `【已售出】${item.title} - 闲置帮`
    : `$${item.price} ${item.title} - 闲置帮`

  // 描述：拼出关键信息，微信/小红书的卡片副标题就取这里
  const parts = [
    `$${item.price}`,
    item.original_price ? `原价 $${item.original_price}` : "",
    item.condition,
    catName,
    school,
  ].filter(Boolean)

  const desc = (item.description ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
  const description = [parts.join(" · "), desc].filter(Boolean).join("　") ||
    `${seller} 在闲置帮转让的${catName}`

  const image = item.images?.[0]
  const url = `${SITE_URL}/items/${item.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "闲置帮",
      locale: "zh_CN",
      url,
      title,
      description,
      images: image
        ? [{ url: image, width: 800, height: 800, alt: item.title }]
        : [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "闲置帮" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [`${SITE_URL}/og-default.png`],
    },
    robots: item.is_sold
      ? { index: false, follow: true }
      : { index: true, follow: true },
    other: {
      // 部分中文平台（含微信）会读这些非标准标签
      "og:price:amount": String(item.price),
      "og:price:currency": "USD",
    },
  }
}

const CONDITION_SCHEMA: Record<string, string> = {
  全新: "https://schema.org/NewCondition",
  仅拆封: "https://schema.org/NewCondition",
  轻微使用: "https://schema.org/UsedCondition",
  明显使用: "https://schema.org/UsedCondition",
}

export default async function ItemLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await fetchItem(id)

  // Google 富摘要：显示价格、图片、库存状态
  const jsonLd = item
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: item.title,
        description: (item.description ?? "").trim().slice(0, 300) || item.title,
        image: item.images?.length ? item.images : [`${SITE_URL}/og-default.png`],
        category: categoryName(item.category),
        itemCondition: CONDITION_SCHEMA[item.condition] ?? "https://schema.org/UsedCondition",
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/items/${item.id}`,
          priceCurrency: "USD",
          price: item.price,
          itemCondition: CONDITION_SCHEMA[item.condition] ?? "https://schema.org/UsedCondition",
          availability: item.is_sold
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
          ...(item.profiles?.name
            ? { seller: { "@type": "Person", name: item.profiles.name } }
            : {}),
          ...(item.location ? { areaServed: item.location } : {}),
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
