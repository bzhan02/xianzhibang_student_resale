import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { AppProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth-context'
import { AppShell } from '@/components/app-shell'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xianzhibang.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '闲置帮 - 留学生二手交易平台',
    template: '%s',
  },
  description: '专为中国留学生打造的二手物品转售平台，轻松买卖教材、电子产品、家具等闲置好物。同校同城，当面交易更安心。',
  keywords: ['留学生二手', '二手交易', '闲置转让', '留学生转租', '教材转让', '毕业甩卖', '同校二手', '闲置帮'],
  applicationName: '闲置帮',
  generator: 'v0.app',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: '闲置帮',
    locale: 'zh_CN',
    url: SITE_URL,
    title: '闲置帮 - 留学生二手交易平台',
    description: '专为中国留学生打造的二手物品转售平台，轻松买卖教材、电子产品、家具等闲置好物。',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: '闲置帮 - 留学生二手交易平台' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '闲置帮 - 留学生二手交易平台',
    description: '专为中国留学生打造的二手物品转售平台，轻松买卖教材、电子产品、家具等闲置好物。',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2a9d5c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-center" />
          </AppProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
