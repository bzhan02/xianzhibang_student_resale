import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xianzhibang.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 私密或无收录价值的页面
        disallow: [
          "/messages",
          "/messages/",
          "/settings",
          "/publish",
          "/favorites",
          "/my-listings",
          "/my-purchases",
          "/profile",
          "/auth",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
