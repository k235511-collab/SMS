/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Allow production builds even when there are type errors (useful for CI/builds here)
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@sms-saas/shared-types'],
  // output: 'standalone' — Enable for Docker/production deployment (requires symlink support; run as admin on Windows)
  ...(process.env.STANDALONE === 'true' ? { output: 'standalone' } : {}),
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.sms-saas.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "style-src-elem 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://accounts.google.com " + (() => {
                try {
                  const u = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
                  return u.origin
                } catch {
                  return 'http://localhost:4000'
                }
              })(),
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
