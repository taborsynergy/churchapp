/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // Security headers (CSP) are set per-request in middleware.ts so they can
  // carry a per-request nonce. No static CSP header here.
};

module.exports = withSentryConfig(nextConfig, {
  // Suppress the Sentry CLI upload banner in CI logs
  silent: true,
  // Upload source maps only in production builds
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
});
