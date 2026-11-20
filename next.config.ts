import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 127.0.0.1 is a different dev origin from localhost. Without this, Next
  // blocks /_next dev resources and the client never boots.
  allowedDevOrigins: ['127.0.0.1'],
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Pin the workspace root: archived experiments under archive/exp still
  // carry their own lockfiles, which makes Turbopack mis-infer the root as
  // ./app and fail local `next dev`/`next build`.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/about.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/portfolio.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
