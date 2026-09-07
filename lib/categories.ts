/**
 * 分类的唯一真相来源。
 * 此前分类名散落在 mock-data.ts、items/[id]/layout.tsx、categories/[slug]/layout.tsx。
 */
import type { CategorySlug } from "./types"

export interface CategoryDef {
  slug: CategorySlug
  name: string
  icon: string
  /** 分类页的 SEO 描述 */
  blurb: string
}

export const CATEGORIES: CategoryDef[] = [
  { slug: "textbooks",   name: "教材书籍", icon: "BookOpen", blurb: "课本、参考书、习题册，学长学姐的教材便宜转给你" },
  { slug: "electronics", name: "电子产品", icon: "Laptop",   blurb: "笔记本、显示器、iPad、耳机，毕业季电子产品低价出" },
  { slug: "furniture",   name: "家具生活", icon: "Armchair", blurb: "床垫、书桌、沙发、厨具，搬家季家具好物等你捡漏" },
  { slug: "clothing",    name: "服装配饰", icon: "Shirt",    blurb: "冬衣、包包、鞋子、学位服，闲置服饰超值转让" },
  { slug: "transport",   name: "交通工具", icon: "Bike",     blurb: "自行车、电动车、滑板车，通勤代步二手更划算" },
]

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug)

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

export function categoryName(slug: string): string {
  return getCategory(slug)?.name ?? "闲置好物"
}
