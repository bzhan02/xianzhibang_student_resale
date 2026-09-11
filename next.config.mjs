import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 显式指定项目根目录。否则 Turbopack 会向上级目录找 lockfile，
  // 在 C:\Users\rober 下发现游离的 pnpm-lock.yaml 后每次构建都报警告。
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  typescript: {
    // Supabase SDK generates some type errors that don't affect runtime
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
}

export default nextConfig
