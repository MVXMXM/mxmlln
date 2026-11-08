import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Pin the workspace root: archived experiments under archive/exp still
  // carry their own lockfiles, which makes Turbopack mis-infer the root as
  // ./app and fail local `next dev`/`next build`.
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/portfolio.html',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
