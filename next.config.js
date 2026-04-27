/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Security headers (CSP) are set per-request in middleware.ts so they can
  // carry a per-request nonce. No static CSP header here.
};

module.exports = nextConfig;
