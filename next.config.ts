import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The catalog is bundled at build time, so the whole app can be exported to
  // any Node host or edge runtime without a database. See docs/ARCHITECTURE.md
  // for how to swap in a hosted catalog provider.
  poweredByHeader: false,
};

export default nextConfig;
