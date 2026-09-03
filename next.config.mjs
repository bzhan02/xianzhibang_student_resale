/** @type {import('next').NextConfig} */
const nextConfig = {
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
